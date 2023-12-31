const { buildSchema } = require('graphql');

module.exports = buildSchema(`
    type Post {
        _id: ID
        title: String!
        content: String!
        imageUrl: String!
        creator: User!
        createdAt: String!
        updatedAt: String!
    }

    type User {
        _id: ID
        name: String!
        email: String!
        password: String
        status: String!
        posts: [Post!]!
    }

    type PostDeleted {
        status: String!
        message: String!
    }

    type StatusUpdated {
        status: String!
        message: String!
    }

    input UserInputData {
        email: String!
        name: String!
        password: String!
    }

    input PostInputData {
        title: String!
        content: String!
        imageUrl: String!
    }

    type RootMutation {
        createUser(userInput: UserInputData): User!
        createPost(postInput: PostInputData): Post!
        deletePost(postId: String!): PostDeleted!
        updatePost(updatePostInput: PostInputData, postId: String!): Post!
        updateStatus(newStatus: String!): StatusUpdated!
    }

    type AuthData {
        token: String!
        userId: String!
    }

    type AllPost {
        posts: [Post!]!
        totalPost: Int!
    }

    type RootQuery {
        login(email: String!, password: String!): AuthData!
        posts(page: Int): AllPost!
        post(postId: String!): Post!
        status: String!
        hello: String!
    }

    schema {
        mutation: RootMutation
        query: RootQuery
    }
`);