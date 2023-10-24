# CS50-Network

# Social Network

This project is a Twitter-like social network website for making posts, following users, and interacting with posts.

## Overview

This social network project is a single-page web application built using Django, Python, JavaScript, HTML, and CSS. It allows users to create posts, follow other users, and interact with posts.

## Features

### New Post
- Users can write and submit text-based posts.
- A new post can be created from the "New Post" section.

### All Posts
- Users can view all posts from all users.
- Posts are displayed with the username of the poster, post content, date and time of creation, and the number of "likes."
- Posts are sorted with the most recent posts displayed first.

### Profile Page
- Clicking on a username displays that user's profile.
- The profile page includes the number of followers, number of people followed, and all posts by the user.
- Users can follow or unfollow other users on their profile page.

### Following
- The "Following" link in the navigation bar takes the user to a page showing posts from users they follow.
- This page is accessible only to signed-in users.

### Pagination
- Posts are displayed with 10 per page, with "Next" and "Previous" buttons for navigation.

### Edit Post
- Users can edit their own posts by clicking the "Edit" button.
- The content is replaced with a textarea for editing.
- Users can save their edits without reloading the entire page.

### Like and Unlike
- Users can like or unlike posts by clicking a button or link.
- The server is updated asynchronously via a fetch call to update the like count without requiring a full page reload.

## Usage

1. Start the Django development server: `python manage.py runserver`.

2. Access the project in your web browser.

3. Register for an account and start using the social network.
