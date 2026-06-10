import http from 'http';

function makeRequest(method, path, data = null, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 8611,
      path: `/api${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function test() {
  try {
    console.log('=== 1. Health Check ===');
    const health = await makeRequest('GET', '/health');
    console.log('Status:', health.status);
    console.log('Data:', JSON.stringify(health.data, null, 2));
    
    console.log('\n=== 2. Login as admin ===');
    const login = await makeRequest('POST', '/auth/login', {
      username: 'admin',
      password: 'admin123',
    });
    console.log('Status:', login.status);
    console.log('Data:', JSON.stringify(login.data, null, 2));
    
    if (login.data.code === 0 && login.data.data?.token) {
      const token = login.data.data.token;
      const user = login.data.data.user;
      console.log('\nUser balance:', user.balance);
      
      console.log('\n=== 3. Get borrow rules ===');
      const rules = await makeRequest('GET', '/borrow/rules', null, token);
      console.log('Status:', rules.status);
      console.log('Data:', JSON.stringify(rules.data, null, 2));
      
      console.log('\n=== 4. Get my borrow records ===');
      const records = await makeRequest('GET', '/borrow/my', null, token);
      console.log('Status:', records.status);
      console.log('Data:', JSON.stringify(records.data, null, 2));
      
      console.log('\n=== 5. Get borrow status ===');
      const status = await makeRequest('GET', '/borrow/status', null, token);
      console.log('Status:', status.status);
      console.log('Data:', JSON.stringify(status.data, null, 2));
      
      console.log('\n=== 6. Get current user (me) ===');
      const me = await makeRequest('GET', '/auth/me', null, token);
      console.log('Status:', me.status);
      console.log('Data:', JSON.stringify(me.data, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  process.exit(0);
}

test();
