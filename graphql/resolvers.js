const bcrypt = require('bcryptjs');
const validator = require('validator');
const jwt = require('jsonwebtoken');

const authenticate = require('../middlewares/authenticate');

const User = require('../models/user');
const Post = require('../models/post');
const deleteFile = require('../helper/deleteFile');
const graphiqlAuthenticate = require('../middlewares/graphqlAuthenticate');

module.exports = {
    async createUser({ userInput }, req) {
        const errors = [];

        if (!validator.isEmail(userInput.email)) errors.push({ message: 'Invalid email', field: 'email' });
        if (!validator.isLength(userInput.password, { min: 8 })) errors.push({ message: 'Password at least 8 characters', field: 'password' });
        if (validator.isEmpty(userInput.password)) errors.push({ message: 'Password can\'t be empty', field: 'password' });

        if (errors.length > 0) {
            const err = new Error('Invalid input');
            err.data = errors;
            err.code = 422;
            throw err;
        }

        const userExist = await User.findOne({ email: userInput.email });

        if (userExist) throw new Error('User with this email already exist');

        const hash = await bcrypt.hash(userInput.password, 12);
        const user = new User({
            name: userInput.name,
            email: userInput.email.toLowerCase(),
            password: hash
        });
        const createdUser = await user.save();
        return { ...createdUser._doc, _id: createdUser._id.toString() };
    },
    async createPost({ postInput }, req) {
        const token = req.get('Authorization')?.split(' ')[1];
        const authorized = authenticate(token);

        if (authorized instanceof Error) {
            throw authorized;
        }

        const { userId } = authorized;

        const errors = [];

        if (validator.isEmpty(postInput.title)) errors.push({ path: 'title', message: 'Title can\'t be empty' });
        if (!validator.isLength(postInput.title, { min: 5 })) errors.push({ path: 'title', message: 'Title at least 5 characters' });
        if (validator.isEmpty(postInput.content)) errors.push({ path: 'content', message: 'Content can\'t be empty' });
        if (!validator.isLength(postInput.content, { min: 5 })) errors.push({ path: 'content', message: 'Content at least 5 characters' });
        if (validator.isEmpty(postInput.imageUrl)) errors.push({ path: 'imageUrl', message: 'Invalid image URL'});

        if (errors.length > 0) {
            const err = new Error('Validation failed');
            err.data = errors;
            err.code = 422;
            throw err;
        }

        const post = new Post({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: userId
        });

        const postDoc = await post.save();
        const user = await User.findById(userId);
        user.posts.push(postDoc._id);
        await user.save();

        return {
            ...postDoc._doc, creator: user
        };
    },
    async deletePost({ postId }, req) {
        graphiqlAuthenticate(req.isAuthenticated);

        const { imageUrl } = await Post.findById(postId);
        console.log(imageUrl);
        deleteFile(imageUrl);
        const userId = req.user.userId;
        const user = await User.findById(userId);
        user.posts.pull(postId);
        user.save();
        await Post.findByIdAndRemove(postId);

        return {
            status: 'success',
            message: 'Post deleted succesfully'
        };
    },
    async updatePost({ updatePostInput, postId }, req) {
        graphiqlAuthenticate(req.isAuthenticated);

        const { title, content, imageUrl } = updatePostInput;

        const errors = [];

        if (validator.isEmpty(title)) errors.push({ path: 'title', message: 'Title can\'t be empty' });
        if (!validator.isLength(title, { min: 5 })) errors.push({ path: 'title', message: 'Title at least 5 characters' });
        if (validator.isEmpty(content)) errors.push({ path: 'content', message: 'Message can\'t be empty' });
        if (!validator.isLength(content, { min: 5 })) errors.push({ path: 'content', message: 'Content can\'t be empty' });
        if (validator.isEmpty(imageUrl)) errors.push({ path: 'imageUrl', message: 'imageUrl can\'t be empty' });

        if (errors.length > 0) {
            const err = new Error('Validation failed');
            err.data = errors;
            err.status = 422;
            throw err;
        }

        const post = await Post.findById(postId).populate('creator');
        post.title = title;
        post.content = content;
        post.imageUrl = imageUrl;
        await post.save();

        console.log(post);
        return { ...post._doc };
    },
    async updateStatus({ newStatus }, req) {
        graphiqlAuthenticate(req.isAuthenticated);

        const user = await User.findById(req.user.userId);
        user.status = newStatus;
        await user.save();

        return {
            status: 'success',
            message: 'Status updated'
        };
    },
    async login({ email, password }) {
        const user = await User.findOne({ email });

        if (!user) {
            const err = new Error('User not found.');
            err.code = 401;
            throw err;
        }

        const isEqual = await bcrypt.compare(password, user.password);

        if (!isEqual) {
            const err = new Error('Wrong password');
            err.code = 401;
            throw err;
        }

        const token = jwt.sign({
            userId: user._id.toString(),
            email: user.email
        }, process.env.JWT_SECRET, { expiresIn: '1h' });

        return {
            token,
            userId: user._id.toString()
        };
    },
    async posts({ page }) {
        const perPage = 2;
        if (!page) page = 1;

        const totalPost = await Post.find().countDocuments();
        const allPost = await Post.find().populate('creator').sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage);

        return { posts: allPost, totalPost };
    },
    async post({ postId }) {
        const post = await Post.findById(postId).populate('creator');

        return post;
    },
    async status(_, req) {        
        const token = req.get('Authorization')?.split(' ')[1];
        const authorized = authenticate(token);

        if (authorized instanceof Error) {
            throw authorized;
        }

        const { userId } = authorized;

        const user = await User.findById(userId);

        return user.status;
    }
};