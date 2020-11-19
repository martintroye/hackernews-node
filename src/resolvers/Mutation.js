const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { APP_SECRET, getUserId } = require('../utils')

function post (parent, args, context) {
    const userId = getUserId(context)
    const link = context.prisma.link.create({
        data:{
            description: args.description,
            url: args.url,
            postedBy: { connect: { id: userId } },
        }
    })
    context.pubsub.publish("NEW_LINK", link)
    return link
}

function del (parent, args, context) {
    return context.prisma.link.delete({
        where: {
            id: +args.id
        }
    })
}

function update (parent, args, context) {
    return context.prisma.link.update({
        where: {
            id: +args.id
        },
        data: {
            description: args.description, 
            url: args.url}
    })
}

async function signup(parent, args, context, info){
    const password = await bcrypt.hash(args.password, 10)
    const user = await context.prisma.user.create({
        data:{
            ...args, password
        }
    })
    const token = jwt.sign({userId: user.id}, APP_SECRET)
    return {
        token,
        user
    }
}

async function login(parent, args, context, info){
    const user = await context.prisma.user.findOne({ where: { email: args.email } })
    if (!user) {
      throw new Error('No such user found')
    }
  
    const valid = await bcrypt.compare(args.password, user.password)
    if (!valid) {
      throw new Error('Invalid password')
    }
  
    const token = jwt.sign({ userId: user.id }, APP_SECRET)
  
    return {
      token,
      user,
    }
}

async function vote(parent, args, context, info) {
    // 1
    const userId = getUserId(context)
  
    // 2
    const vote = await context.prisma.vote.findOne({
      where: {
        linkId_userId: {
          linkId: Number(args.linkId),
          userId: userId
        }
      }
    })
  
    if (Boolean(vote)) {
      throw new Error(`Already voted for link: ${args.linkId}`)
    }
  
    // 3
    const newVote = context.prisma.vote.create({
      data: {
        user: { connect: { id: userId } },
        link: { connect: { id: Number(args.linkId) } },
      }
    })
    context.pubsub.publish("NEW_VOTE", newVote)
  
    return newVote
  }


module.exports = {
    post,
    del,
    update,
    signup,
    login,
    vote
}