const jwt = require('jsonwebtoken');

const secret = 'nadkjnksajdn00123=932102i130daoiae32313adsnkba%$%^$%^';

const adminToken = jwt.sign({ sub: 'admin-123', email: 'admin@test.com', role: 'admin' }, secret, { expiresIn: '7d' });
const alumniToken = jwt.sign({ sub: 'alumni-123', email: 'alumni@test.com', role: 'alumni' }, secret, { expiresIn: '7d' });
const studentToken = jwt.sign({ sub: 'student-123', email: 'student@test.com', role: 'student' }, secret, { expiresIn: '7d' });

console.log('ADMIN_TOKEN=' + adminToken);
console.log('ALUMNI_TOKEN=' + alumniToken);
console.log('STUDENT_TOKEN=' + studentToken);
