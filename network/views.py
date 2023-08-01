from django.core.paginator import Paginator
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import HttpResponseRedirect, JsonResponse
from django.shortcuts import render
from django.urls import reverse
import json

from .models import User, Post, Follow


def index(request):
    # Authenticated users view their inbox
    if request.user.is_authenticated:
        return render(request, "network/index.html")

    # Everyone else is prompted to sign in
    else:
        return HttpResponseRedirect(reverse("login"))


@login_required
def new_post(request):

    # Creating a new post must be via POST
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    # Add new post to DB
    data = json.loads(request.body)

    # Get contents of post
    content = data.get("content", "")

    # Create post
    post = Post(
            user=request.user,
            content=content,
            )
    post.save()

    return JsonResponse({"message": "Post created successfully."}, status=201)


def like_post(request, postId):
    post = Post.objects.get(pk=postId)
    user = request.user

    if user in post.likes.all():
        post.likes.remove(user)
        liked = False
    else:
        post.likes.add(user)
        liked = True

    # Save the updated like count
    like_count = post.likes.count()
    post.save()

    return JsonResponse({'likes': like_count, 'liked': liked})


def edit_post(request, postId):
    # Retrieve the post to be edited from the database
    post = Post.objects.get(pk=postId)

    # Check if the user is the owner of the post
    if request.user != post.user:
        return JsonResponse({
            'error': 'You do not have permission to edit this post.'
        }, status=403)

    if request.method == 'PUT':
        # Get the new content from the request body
        data = request.body.decode('utf-8')
        try:
            data = json.loads(data)
            new_content = data.get('content')
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid data format.'}, status=400)

        # Update the post with the new content
        post.content = new_content
        post.save()

        serialized_post = post.serialize()

        # Return the updated post data in the response
        return JsonResponse({
            'message': 'Post updated successfully.',
            'post': serialized_post
        }, status=200)

    # Return an error response if the request method is not PUT
    return JsonResponse({'error': 'Invalid request method.'}, status=405)


@login_required
def posts(request, posts):

    # Filter posts returned based on page
    if posts == "all":
        posts = Post.objects.all()
    elif posts == "profile":
        posts = Post.objects.filter(user__username=request.GET.get('username'))
    elif posts == "following":
        # Get the user IDs of the users followed by the current user
        followed_user_ids = Follow.objects.filter(follower=request.user).values_list('followed_id', flat=True)
        # Get posts by followed users in reverse chronological order
        posts = Post.objects.filter(user__id__in=followed_user_ids)
    else:
        return JsonResponse({"error": "Invalid post."}, status=400)

    # Return posts in reverse chronological order
    posts = posts.order_by("-timestamp").all()

    # Paginate the posts
    paginator = Paginator(posts, 10)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)

    connectedUser = request.user.username

    # Serialize the paginated posts and check if the user has liked each post
    serialized_posts = []
    for post in page_obj:
        serialized_post = post.serialize()

        # Check if the current user's username is in the list of usernames of users who liked the post
        if connectedUser in post.likes.values_list('username', flat=True):
            liked = True
        else:
            liked = False

        # Add the 'liked' field to the serialized post
        serialized_post['liked'] = liked

        serialized_posts.append(serialized_post)

    # Create a dictionary to hold pagination information and the posts array
    response_data = {
        'next_page_number': page_obj.next_page_number() if page_obj.has_next() else None,
        'previous_page_number': page_obj.previous_page_number() if page_obj.has_previous() else None,
        'count': paginator.count,
        'posts': serialized_posts,
        'connectedUser': connectedUser,
    }

    return JsonResponse(response_data, safe=False)


@login_required
def profile(request, username):
    try:
        user = User.objects.get(username=username)
    except User.DoesNotExist:
        return JsonResponse({"error": "User not found."}, status=404)

    followers_count = user.followers.count()
    following_count = user.following.count()

    # Check if the current user is following the profile user
    is_following = Follow.objects.filter(follower=request.user, followed=user).exists()

    connectedUser = request.user.username

    response_data = {
        'followers_count': followers_count,
        'following_count': following_count,
        'is_following': is_following,
        'connectedUser': connectedUser
    }

    return JsonResponse(response_data)


@login_required
def follow_user(request, username):
    if request.method == 'POST':
        user_to_follow = User.objects.get(username=username)
        if request.user != user_to_follow:
            Follow.objects.get_or_create(follower=request.user, followed=user_to_follow)
            return JsonResponse({"message": "Successfully followed user."}, status=200)
        return JsonResponse({"error": "You cannot follow yourself."}, status=400)
    elif request.method == 'DELETE':
        user_to_unfollow = User.objects.get(username=username)
        Follow.objects.filter(follower=request.user, followed=user_to_unfollow).delete()
        return JsonResponse({"message": "Successfully unfollowed user."}, status=200)
    else:
        return JsonResponse({"error": "Invalid request method."}, status=400)


def login_view(request):
    if request.method == "POST":

        # Attempt to sign user in
        username = request.POST["username"]
        password = request.POST["password"]
        user = authenticate(request, username=username, password=password)

        # Check if authentication successful
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "network/login.html", {
                "message": "Invalid username and/or password."
            })
    else:
        return render(request, "network/login.html")


def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))


def register(request):
    if request.method == "POST":
        username = request.POST["username"]
        email = request.POST["email"]

        # Ensure password matches confirmation
        password = request.POST["password"]
        confirmation = request.POST["confirmation"]
        if password != confirmation:
            return render(request, "network/register.html", {
                "message": "Passwords must match."
            })

        # Attempt to create new user
        try:
            user = User.objects.create_user(username, email, password)
            user.save()
        except IntegrityError:
            return render(request, "network/register.html", {
                "message": "Username already taken."
            })
        login(request, user)
        return HttpResponseRedirect(reverse("index"))
    else:
        return render(request, "network/register.html")
