from django.urls import path, re_path

from . import views

urlpatterns = [
    path("", views.index, name="index"),
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),

    # API Routes
    path("new_post", views.new_post, name="new_post"),
    path("posts/<str:posts>/", views.posts, name="posts"),
    path("profile/<str:username>/", views.profile, name="profile"),
    path("follow/<str:username>/", views.follow_user, name="follow"),
    path("edit_post/<int:postId>/", views.edit_post, name="edit_post"),
    path('like_post/<int:postId>/', views.like_post, name='like_post'),

    # Catch-all route for all other paths
    re_path(r"^.*$", views.index, name="index"),
]
