import express from 'express'

const port = 3000
const app = express()

app.get('/', (req, res) => res.send('op-middleware'))

app.listen(port, () => console.log(`Listening at port: ${port}`))
