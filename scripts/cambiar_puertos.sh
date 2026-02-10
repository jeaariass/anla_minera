#!/bin/bash

echo "🔧 Cambiando puertos de 5000 a 3001..."

# 1. Backend .env.local
sed -i '' 's/PORT=5000/PORT=3001/g' backend/.env.local

# 2. Backend server.js - Puerto por defecto
sed -i '' 's/|| 5000/|| 3001/g' backend/src/server.js

# 3. Backend server.js - URLs CORS
sed -i '' 's/:5000/:3001/g' backend/src/server.js

# 4. Frontend vite.config.js
sed -i '' 's/localhost:5000/localhost:3001/g' frontend/vite.config.js

# 5. Frontend .env.development
sed -i '' 's/localhost:5000/localhost:3001/g' frontend/.env.development

# 6. Mobile .env
sed -i '' 's/:5000/:3001/g' tu-mina-mobile/.env

# 7. Mobile constants.js - Solo LOCAL_PORT
sed -i '' "s/LOCAL_PORT = '5000'/LOCAL_PORT = '3001'/g" tu-mina-mobile/src/utils/constants.js

echo "✅ Cambios completados!"
echo ""
echo "📋 Verificando cambios..."
echo ""
echo "Backend .env.local:"
grep "PORT" backend/.env.local
echo ""
echo "Backend server.js (primera línea con PORT):"
grep "const PORT" backend/src/server.js | head -1
echo ""
echo "Frontend vite.config.js:"
grep "target:" frontend/vite.config.js
echo ""
echo "Frontend .env.development:"
cat frontend/.env.development
echo ""
echo "Mobile .env:"
cat tu-mina-mobile/.env
echo ""
echo "Mobile constants.js:"
grep "LOCAL_PORT" tu-mina-mobile/src/utils/constants.js

echo ""
echo "🎉 ¡Listo! Todos los puertos cambiados a 3001"