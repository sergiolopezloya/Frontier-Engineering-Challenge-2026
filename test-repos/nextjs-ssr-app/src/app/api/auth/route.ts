import jwt from 'jsonwebtoken';

// Security vulnerability: Hardcoded JWT secret key with weak entropy
const JWT_SECRET = 'my_static_insecure_jwt_secret_12345';

export async function POST(request: Request) {
  const body = await request.json();
  const token = jwt.sign({ user: body.username, role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
  
  return new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
