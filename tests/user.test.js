const request = require('supertest')
const app = require('../src/app')
const User = require('../src/models/user')
const { userOneId, userOne, setUpDatabase } = require('./fixtures/db')


beforeEach(setUpDatabase)

test('should signup a new user', async () => {
    const response = await request(app).post('/users').send({
        name: 'mamado',
        email: 'mamado@gmail.com',
        password: 'Hamza_123'
    }).expect(201)

    // Assert that the databas e was changed correctly
    const user = await User.findById(response.body.user._id)
    expect(user).not.toBeNull()

    // Assertions about the response
    expect(response.body).toMatchObject({
        user: {
            name: 'mamado',
            email: 'mamado@gmail.com'
        },
        token: user.tokens[0].token
    })
    expect(user.password).not.toBe('Hamza_123')

})



test('should login user', async () => {
    const response = await request(app).post('/users/login').send({
        email: userOne.email,
        password: userOne.password
    }).expect(200)
    const user = await User.findById(userOneId)
    expect(response.body.token).toBe(user.tokens[1].token)

})

test('should not login nonexistent user', async () => {
    await request(app).post('/users/me').send({
        name: 'bor3y',
        email: 'bor3y@gmail.com',
        password: 'lfkasd321d'
    }).expect(404)
})



test('should get profile for user', async () => {
    const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)


})

test('should not get profile for unauthenticated user', async () => {
    await request(app)
        .get('/users/me')
        .send()
        .expect(401)//no setting for validation so 401
})

test('should delete account for user', async () => {
    await request(app)
        .delete('/users/me')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    const removedUser = await User.findById(userOne._id)
    expect(removedUser).toBeNull()
})


test('should not delete account for unauthenticated', async () => {
    await request(app)
        .delete('/users/me')
        .send()
        .expect(401)
})

test('should upload avatar image', async () => {
    await request(app)
        .post('/users/me/avatar')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .attach('avatar', 'tests/fixtures/profile-pic.jpg')
        .expect(200)

    const user = await User.findById(userOneId)
    expect(user.avatar).toEqual(expect.any(Buffer))
})

test('should update user name', async () => {
    const user = await User.findById(userOneId)

    await request(app)
        .patch('/users/me/')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({ name: 'ahmed' })
        .expect(200)
    const userAfterReq = await User.findById(userOneId)

    expect(userAfterReq.name).toEqual('ahmed')
})

test('should not update invalid fields', async () => {
    const user = await User.findById(userOneId)
    await request(app)
        .patch('/users/me/')
        .set('Authorization', `Bearer ${user.tokens[0].token}`)
        .send({ location: 'bla bla' })
        .expect(400)

})