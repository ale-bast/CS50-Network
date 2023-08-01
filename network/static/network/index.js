document.addEventListener('DOMContentLoaded', function() {

    document.querySelector('#index').addEventListener('click', function(event) {
        event.preventDefault(); // Prevent the default behavior of the anchor tag
        history.pushState({ posts: 'all' }, '', '/posts/all');
        load_posts('all');
    });

    const profileLink = document.querySelector('#profile');
    profileLink.addEventListener('click', function(event) {
        event.preventDefault(); // Prevent the default behavior of the anchor tag
        const username = profileLink.dataset.username;
        history.pushState({ posts: 'profile', username: username }, '', `/profile/${username}`);
        get_profile(username);
    });

    document.querySelector('#following').addEventListener('click', function(event) {
        event.preventDefault(); // Prevent the default behavior of the anchor tag
        history.pushState({ posts: 'following' }, '', '/posts/following');
        load_posts('following');
    });

    document.querySelector('#post-form').onsubmit = new_post;

    // By default, load the posts 
    load_posts('all');
});

// History
window.onpopstate = function(event) {
    if (event.state) {
        const page = event.state.posts;
        const username = event.state.username;
        if (page === 'all') {
            load_posts('all');
        } else if (page === 'profile' && username) {
            get_profile(username);
        } else if (page === 'following') {
            load_posts('following');
        }
    }
};

function get_profile(username) {

    // Load the posts for the user's profile
    load_posts('profile', username);

    // Clear the previous content before loading new profile info
    document.querySelector('#profile-view').innerHTML = '';

    // Show the profile-view element
    document.querySelector('#profile-view').style.display = 'block';

    // Set the url to fetch the follower and following counts for the user
    const url = `/profile/${username}/`;

    // Fetch counts from the server
    fetch(url)
        .then(response => response.json())
        .then( data => {
            const profileBox = document.createElement('div');
            profileBox.classList.add("card", "my-4");

            // Set data-following attribute to determine follow status
            profileBox.setAttribute('data-following', data.is_following);

            // Populate the profile box with user information
            profileBox.innerHTML = `
                <div class="card-body">
                    <div class="row">
                        <div class="col">
                            <h5><strong>${username}</strong></h5>
                        </div>
                        <div class="col">
                            <p>Followers: ${data.followers_count}</p>
                        </div>
                        <div class="col">
                            <p>Following: ${data.following_count}</p>
                        </div>
                        <div class="col">
                            ${data.connectedUser !== username ?
                                (data.is_following ? '<button id="unfollow-btn" class="btn btn-danger">Unfollow</button>' :
                                    '<button id="follow-btn" class="btn btn-primary">Follow</button>') :
                                ''
                            }
                        </div>
                    </div>
                </div>
            `;

            // Append the profile box to the profile-view element
            document.querySelector('#profile-view').append(profileBox);

            // Attach event listeners to follow/unfollow buttons
            const followBtn = profileBox.querySelector('#follow-btn');
            const unfollowBtn = profileBox.querySelector('#unfollow-btn');

            if (followBtn) {
                followBtn.addEventListener('click', function() {
                    toggle_follow(username, true);
                });
            }

            if (unfollowBtn) {
                unfollowBtn.addEventListener('click', function() {
                    toggle_follow(username, false);
                });
            }
        });
}

function toggle_follow(username, follow) {
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const url = `/follow/${username}/`;

    fetch(url, {
        method: follow ? 'POST' : 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
    })
    .then(response => response.json())
    .then(() => {
        // Reload the profile after follow/unfollow
        get_profile(username);
    });
}

function load_posts(posts, username, page=1) {

    const postsView = document.querySelector('#posts-view');

    // Clear the previous content before loading new posts
    postsView.innerHTML = '';

    // Show the postsView element
    postsView.style.display = 'block';

    // Set the url based on the posts and username
    let url = `/posts/${posts}/?`;

    // Set the page title based on the page
    const title = posts.charAt(0).toUpperCase() + posts.slice(1); 
    if (posts === 'all') {
        document.querySelector('#new-post').style.display = 'block';
        document.querySelector('#profile-view').style.display = 'none';
        document.querySelector('#all-posts').innerHTML = `<h1>${title} Posts</h1>`;
    }
    else if (posts === 'profile') {
        document.querySelector('#new-post').style.display = 'none';
        document.querySelector('#all-posts').innerHTML = `<h1>${title}</h1>`;
        url += `username=${username}&`;
    }
    else {
        document.querySelector('#new-post').style.display = 'none';
        document.querySelector('#profile-view').style.display = 'none';
        document.querySelector('#all-posts').innerHTML = `<h1>${title} Posts</h1>`;
    }

    // Append page number to the URL for pagination
    url += `page=${page}`;

    // Fetch posts from the server
    fetch(url)
        .then(response => response.json())
        .then(data => {
            // Create a document fragment to hold the post boxes
            const postFragment = document.createDocumentFragment();

            // Loop through the posts and create post boxes in memory
            data.posts.forEach(post => {
                const postBox = document.createElement('div');
                postBox.setAttribute('id', `post-${post.id}`); // Set the element's ID
                postBox.classList.add("card", "my-4");

                // Populate the post box with post details
                postBox.innerHTML = `
                    <div class="card-body">
                    <h5><a id="profile" class="pb-2 pe-auto" data-username="${post.user}" href="#"><strong>${post.user}</strong></a></h5>
                    ${data.connectedUser === post.user ? `<a id='edit' class='pb-2 pe-auto' href='#' data-post-id='${post.id}'>edit</a>` : ""}
                    <p class="mb-0">${post.content}</p>
                    <p class="mb-0 text-secondary">${post.timestamp}</p>
                    <p class="mb-0">❤️<span id="like-count-${post.id}">${post.likes}</span></p>
                    <button class="btn btn-primary btn-like" data-post-id="${post.id}" id="like-${post.id}" data-liked="${post.liked}">
                        ${post.liked ? 'Unlike' : 'Like'}
                    </button>
                    `;

                // Attach an event listener to the like/unlike button
                const likeButton = postBox.querySelector('.btn-like');
                if (likeButton) {
                    likeButton.addEventListener('click', function() {
                        const postId = likeButton.dataset.postId;
                        const isLiked = likeButton.dataset.liked === "true";
                        toggleLike(postId, !isLiked);
                    });
                }
                
                // Attach an event listener to the h5 element in the postBox
                const profileLink = postBox.querySelector('#profile');
                profileLink.addEventListener('click', function(event) {
                    event.preventDefault(); // Prevent the default behavior of the anchor tag
                    const username = profileLink.dataset.username;
                    history.pushState({ posts: 'profile', username: username }, '', `/profile/${username}`);
                    get_profile(username);
                });

                const editLink = postBox.querySelector('#edit');
                if (editLink) {
                    editLink.addEventListener('click', function (event) {
                        event.preventDefault(); // Prevent the default behavior of the anchor tag

                        // Get the post ID from the data-post-id attribute
                        const postId = editLink.dataset.postId;

                        // Get the post box element
                        const postBoxElement = event.target.closest('.card');

                        // Replace the post content with a textarea for editing
                        const postContent = postBoxElement.querySelector('.mb-0');
                        const content = postContent.textContent.trim();
                        postContent.innerHTML = `<textarea class="form-control">${content}</textarea>`;

                        // Create a Save button and append it to the post box
                        const saveButton = document.createElement('button');
                        saveButton.textContent = 'Save';
                        saveButton.setAttribute('id', `save`);
                        saveButton.classList.add('btn', 'btn-primary', 'mt-2');
                        postBoxElement.appendChild(saveButton);

                        // Attach an event listener to the Save button to handle saving the edited post
                        saveButton.addEventListener('click', function () {
                            // Get the edited content from the textarea
                            const editedContent = postBoxElement.querySelector('textarea').value;

                            // Call the function to save the edited post
                            saveEditedPost(postId, editedContent);
                        });
                    });
                }

                // Append the post box to the document fragment
                postFragment.appendChild(postBox);
            });

            // Append all post boxes from the document fragment to the postsView element at once
            postsView.appendChild(postFragment);
            pagination(data, page, posts, username);
        });
}

function toggleLike(postId, like) {
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const url = `/like_post/${postId}/`;

    fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
    })
        .then(response => response.json())
        .then(data => {
            // Update the like count on the page
            const likeCountElement = document.getElementById(`like-count-${postId}`);
            if (likeCountElement) {
                likeCountElement.textContent = data.likes;
            }

            // Update the like/unlike button text and data-liked attribute
            const likeButton = document.getElementById(`like-${postId}`);
            if (likeButton) {
                likeButton.textContent = like ? 'Unlike' : 'Like';
                likeButton.dataset.liked = like;
            }
        })
        .catch(error => {
            console.log('Error:', error);
        });
}

function saveEditedPost(postId, editedContent) {
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    // Perform a fetch request to update the post content on the server
    fetch(`/edit_post/${postId}/`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify({
            content: editedContent,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            // If the post was successfully updated on the server
            // Replace the textarea with the updated post content
            if (data.post) {
                const postContent = document.createElement('p');
                postContent.classList.add('mb-0');
                postContent.textContent = editedContent;

                // Get the post box element using the unique id
                const postBoxElement = document.querySelector(`#post-${postId}`);

                // Replace the existing post content with the edited content
                const existingPostContent = postBoxElement.querySelector('.mb-0');
                existingPostContent.replaceWith(postContent);

                // Remove the Save button
                postBoxElement.querySelector('#save').remove();
            } else {
                // Handle error if needed
                console.log('Error updating post.');
            }
        })
        .catch((error) => {
            console.log('Error:', error);
        });
}

function pagination(data, page, posts, username) {

    // Calculate total number of pages
    const totalPages = Math.ceil(data.count / 10); // Assuming 10 posts per page, adjust as needed.

    // Check if there are posts available
    if (totalPages > 1) {
        // Create Next and Previous buttons based on pagination data
        // Create the pagination list
        const paginationList = document.createElement('ul');
        paginationList.classList.add('pagination');

        // Create Previous button
        if (data.previous_page_number) {
            const previousBtn = createPaginationButton('Previous', data.previous_page_number, posts, username);
            paginationList.appendChild(previousBtn);
        }

        // Create page number buttons
        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = createPaginationButton(i, i, posts, username);
            if (i === page) {
                pageBtn.classList.add('active');
            }
            paginationList.appendChild(pageBtn);
        }

        // Create Next button
        if (data.next_page_number) {
            const nextBtn = createPaginationButton('Next', data.next_page_number, posts, username);
            paginationList.appendChild(nextBtn);
        }

        // Replace the previous pagination list with the updated one
        const oldPaginationList = document.querySelector('.pagination');
        if (oldPaginationList) {
            oldPaginationList.replaceWith(paginationList);
        } else {
            // If no pagination list exists, append the new one
            document.querySelector('#posts-view').appendChild(paginationList);
        }
    }
}

function createPaginationButton(text, page, posts, username) {
    let user = null
    if (posts === 'profile') {
        user = username
    }
    const pageBtn = document.createElement('li');
    pageBtn.classList.add('page-item');
    const pageLink = document.createElement('a');
    pageLink.classList.add('page-link');
    pageLink.textContent = text;
    pageBtn.appendChild(pageLink);
    pageBtn.addEventListener('click', function () {
        load_posts(posts, user, page);
    });
    return pageBtn;
}

function new_post() {

    // Get value from form field
    const content = document.querySelector('#post-content').value;
    document.querySelector('#post-content').value = '';


    // Get CSRF token from the form
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]').value;

    // Post 
    fetch('/new_post', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrftoken,
        },
        body: JSON.stringify({
            content : content,
        })
    })
    .then(response => {
        if (response.status === 201) {
            // Post sent successfully, switch to the 'All Posts' page 
            load_posts('all', null);
        } else {
            // Handle other responses or errors if needed
            return response.json();
        }
    })

    // Stop form from submitting
    return false;
}
