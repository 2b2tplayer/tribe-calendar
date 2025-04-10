const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
} = require('firebase/auth');
const { getFirestore } = require('firebase/firestore');

// Cliente Firebase para operaciones del lado del cliente
const firebaseConfig = {
  apiKey: "AIzaSyC72iSuRhZ0pCekj0DN2EOx6DAGxzGFsrE",
  authDomain: "koafy-5bbb8.firebaseapp.com",
  projectId: "koafy-5bbb8",
  storageBucket: "koafy-5bbb8.firebasestorage.app",
  messagingSenderId: "323380487956",
  appId: "1:323380487956:web:19644d280a0a1912c10401",
  measurementId: "G-D90V34D76C"
};

// Inicializar Firebase Cliente
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Mock para desarrollo
// Estos objetos simulan las API de Firebase Admin durante el desarrollo
const mockAdminAuth = {
  getUserByEmail: async (email) => {
    console.log(`[MOCK] Buscando usuario con email: ${email}`);
    return null; // Simular que el usuario no existe
  },
  verifyIdToken: async (token) => {
    console.log(`[MOCK] Verificando token: ${token.substring(0, 10)}...`);
    // Devolver un objeto usuario simulado
    return {
      uid: 'mock-user-123',
      email: 'mock@example.com',
      name: 'Usuario Mock'
    };
  }
};

const mockAdminDb = {
  collection: (name) => {
    console.log(`[MOCK] Accediendo a colección: ${name}`);
    return {
      doc: (id) => {
        console.log(`[MOCK] Accediendo a documento: ${id}`);
        return {
          set: async (data) => {
            console.log(`[MOCK] Guardando datos: ${JSON.stringify(data).substring(0, 100)}...`);
            return true;
          },
          get: async () => {
            console.log(`[MOCK] Obteniendo documento: ${id}`);
            return {
              exists: false,
              data: () => null
            };
          },
          update: async (data) => {
            console.log(`[MOCK] Actualizando datos: ${JSON.stringify(data).substring(0, 100)}...`);
            return true;
          },
          delete: async () => {
            console.log(`[MOCK] Eliminando documento: ${id}`);
            return true;
          }
        };
      },
      where: () => {
        return {
          where: () => {
            return {
              where: () => {
                return {
                  get: async () => {
                    console.log(`[MOCK] Ejecutando consulta`);
                    return {
                      empty: true,
                      forEach: () => {}
                    };
                  },
                  limit: () => {
                    return {
                      get: async () => {
                        console.log(`[MOCK] Ejecutando consulta con límite`);
                        return {
                          empty: true,
                          forEach: () => {}
                        };
                      }
                    };
                  }
                };
              },
              get: async () => {
                console.log(`[MOCK] Ejecutando consulta`);
                return {
                  empty: true,
                  forEach: () => {}
                };
              },
              limit: () => {
                return {
                  get: async () => {
                    console.log(`[MOCK] Ejecutando consulta con límite`);
                    return {
                      empty: true,
                      forEach: () => {}
                    };
                  }
                };
              }
            };
          },
          get: async () => {
            console.log(`[MOCK] Ejecutando consulta`);
            return {
              empty: true,
              forEach: () => {}
            };
          },
          limit: () => {
            return {
              get: async () => {
                console.log(`[MOCK] Ejecutando consulta con límite`);
                return {
                  empty: true,
                  forEach: () => {}
                };
              }
            };
          }
        };
      }
    };
  }
};

let adminAuth = mockAdminAuth;
let adminDb = mockAdminDb;

// Intentar inicializar Firebase Admin si hay credenciales
try {
  // En un entorno real, inicializarías con credenciales
  // admin.initializeApp({
  //   credential: admin.credential.cert(serviceAccount)
  // });
  
  // Inicializar sin credenciales (solo para desarrollo)
  // Este enfoque no funcionará con operaciones reales, pero permite que la app se inicie
  console.log('Usando mocks para Firebase Admin (solo desarrollo)');
} catch (error) {
  console.error('Error al inicializar Firebase Admin:', error);
  console.log('Continuando con mocks para desarrollo...');
}

// Exportar todo lo que podríamos necesitar
module.exports = {
  app: firebaseApp,
  auth,
  db,
  adminAuth,
  adminDb,
  // Funciones de autenticación para usar en el controlador
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
};