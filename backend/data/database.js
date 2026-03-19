const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname);
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const beersData = [
  {
    id: 1,
    name: 'Kingfisher Light',
    brand: 'Kingfisher',
    type: 'Light Lager',
    price: 120,
    stock: 100,
    description: 'A refreshing light lager with a crisp, clean taste. Perfect for a casual evening.',
    abv: '4.8%',
    color: 'blue',
    emoji: '🍺'
  },
  {
    id: 2,
    name: 'Kingfisher Strong',
    brand: 'Kingfisher',
    type: 'Strong Lager',
    price: 150,
    stock: 80,
    description: 'Bold and robust with a strong malt character. For those who like it intense.',
    abv: '8.0%',
    color: 'orange',
    emoji: '🍺'
  },
  {
    id: 3,
    name: 'KF Ultra Light',
    brand: 'KF Ultra',
    type: 'Premium Light',
    price: 140,
    stock: 60,
    description: 'Premium ultra-filtered light beer with a smooth, refined finish.',
    abv: '5.0%',
    color: 'purple',
    emoji: '🍺'
  },
  {
    id: 4,
    name: 'KF Ultra Strong',
    brand: 'KF Ultra',
    type: 'Premium Strong',
    price: 170,
    stock: 50,
    description: 'Ultra premium strong beer with rich, complex flavors and full body.',
    abv: '8.5%',
    color: 'red',
    emoji: '🍺'
  },
  {
    id: 5,
    name: 'Budweiser',
    brand: 'Budweiser',
    type: 'American Lager',
    price: 180,
    stock: 90,
    description: 'The King of Beers. A smooth, refreshing American-style lager.',
    abv: '5.0%',
    color: 'crimson',
    emoji: '🍺'
  },
  {
    id: 6,
    name: 'Breezer',
    brand: 'Bacardi',
    type: 'Alcopop',
    price: 130,
    stock: 70,
    description: 'Refreshing tropical fruit flavored alcoholic drink. Sweet, fruity and fun!',
    abv: '4.8%',
    color: 'pink',
    emoji: '🍹'
  }
];

const ensureFile = (filename, defaultData) => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf8');
  }
  return filePath;
};

// Initialize beers
ensureFile('beers.json', beersData);

// Initialize admin user
const adminPasswordHash = bcrypt.hashSync('admin123', 10);
const defaultUsers = [
  {
    id: uuidv4(),
    username: 'admin',
    password: adminPasswordHash,
    email: 'admin@beerstore.com',
    phone: '9999999999',
    address: 'BeerStore HQ, Bangalore',
    role: 'admin',
    createdAt: new Date().toISOString(),
    lastLogin: null,
    loginCount: 0
  }
];
ensureFile('users.json', defaultUsers);
ensureFile('orders.json', []);

const usersFile = path.join(DATA_DIR, 'users.json');
const ordersFile = path.join(DATA_DIR, 'orders.json');
const beersFile = path.join(DATA_DIR, 'beers.json');

const readUsers = () => JSON.parse(fs.readFileSync(usersFile, 'utf8'));
const readOrders = () => JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
const readBeers = () => JSON.parse(fs.readFileSync(beersFile, 'utf8'));

const writeUsers = (data) => fs.writeFileSync(usersFile, JSON.stringify(data, null, 2), 'utf8');
const writeOrders = (data) => fs.writeFileSync(ordersFile, JSON.stringify(data, null, 2), 'utf8');
const writeBeers = (data) => fs.writeFileSync(beersFile, JSON.stringify(data, null, 2), 'utf8');

// Ensure admin account always exists in persisted environments.
const ensureAdminAccount = () => {
  const users = readUsers();
  const adminEmail = 'admin@beerstore.com';
  const resetAdminPassword = process.env.RESET_DEFAULT_ADMIN_PASSWORD === 'true';

  const existingAdmin = users.find((u) => u.email === adminEmail || u.role === 'admin');

  if (!existingAdmin) {
    users.unshift({
      id: uuidv4(),
      username: 'admin',
      password: bcrypt.hashSync('admin123', 10),
      email: adminEmail,
      phone: '9999999999',
      address: 'BeerStore HQ, Bangalore',
      role: 'admin',
      createdAt: new Date().toISOString(),
      lastLogin: null,
      loginCount: 0
    });
    writeUsers(users);
    return;
  }

  if (resetAdminPassword) {
    existingAdmin.username = 'admin';
    existingAdmin.email = adminEmail;
    existingAdmin.role = 'admin';
    existingAdmin.password = bcrypt.hashSync('admin123', 10);
    writeUsers(users);
  }
};

ensureAdminAccount();

// Hide admin users from customer endpoints
const getCustomersOnly = () => {
  const users = readUsers();
  return users.filter(u => u.role === 'customer');
};

// Sanitize user object (remove sensitive fields + hide admin)
const sanitizeUser = (user) => {
  if (!user || user.role === 'admin') return null;
  const { password, ...safe } = user;
  return safe;
};

module.exports = { readUsers, readOrders, readBeers, writeUsers, writeOrders, writeBeers, uuidv4, getCustomersOnly, sanitizeUser };
