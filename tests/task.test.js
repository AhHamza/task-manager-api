const request = require('supertest')
const app = require('../src/app')
const Task = require('../src/models/task')
const { userOneId, userOne, userTwoId, userTwo, taskOne, setUpDatabase } = require('./fixtures/db')

beforeEach(setUpDatabase)

test('Should create task for user', async () => {
    const response = await request(app)
        .post('/tasks')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send({
            description: 'first test task',
            completed: true
        })
        .expect(200)

    const task = await Task.findById(response.body._id)
    // expect(task).not.toBeNull()
    expect(task.owner).toEqual(userOne._id)
})

test('should get all tasks', async () => {
    const tasks = await Task.find({})
    console.log('all tasks: ' + tasks);
    const response = await request(app)
        .get('/tasks')
        .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
        .send()
        .expect(200)

    expect(response.body.length).toBe(2)
})

test('should not delete first task by second user', async () => {
    const response = await request(app)
        .delete('/tasks/' + taskOne._id)
        .set('Authorization', `Bearer ${userTwo.tokens[0].token}`)
        .send()
        .expect(401)

    const taskOneDB = await Task.findById(taskOne._id)
    expect(taskOneDB).not.toBeNull()
})