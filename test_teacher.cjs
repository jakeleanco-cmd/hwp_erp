const axios = require('axios');
async function test() {
  try {
    const res = await axios.post('http://localhost:3001/api/teachers', {
      teacherId: 'test1',
      password: 'test',
      name: 'test'
    });
    console.log(res.data);
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
  }
}
test();
