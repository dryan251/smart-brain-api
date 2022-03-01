const jwt = require('jsonwebtoken');
const redis = require('redis');

(async () => {
  //setup redis
  const redisClient = redis.createClient({
    url: process.env.REDIS_URI,
  });

  redisClient.on('error', (err) => console.log('Redis Client Error', err));

  await redisClient.connect();
})();

const signToken = (email) => {
  const jwtPayload = { email };
  return jwt.sign(jwtPayload, 'My_JWT_SuperSecret', { expiresIn: '4 days' });
};

const setToken = async (key, value) => {
  return Promise.resolve(redisClient.set(key, value));
};

const createSessions = (user) => {
  //JWT Token, return user data
  const { id, email } = user;
  const token = signToken(email);
  return setToken(token, id)
    .then(() => ({ success: 'true', userId: id, token }))
    .catch(console.log);
};

const handleSignin = (db, bcrypt, req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return Promise.reject('incorrect form submission');
  }
  return db
    .select('email', 'hash')
    .from('login')
    .where('email', '=', email)
    .then((data) => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db
          .select('*')
          .from('users')
          .where('email', '=', email)
          .then((user) => user[0])
          .catch((err) => res.status(400).json('unable to get user'));
      } else {
        return Promise.reject('wrong credentials');
      }
    })
    .catch((err) => err);
};

const getAuthTokenId = (req, res) => {
  const { authorization } = req.headers;
  return redisClient.get(authorization, (err, reply) => {
    if (err || !reply) {
      return res.status(401).send('Unauthorized');
    }
    return res.json({ id: reply });
  });
};

const signinAuthentication = (db, bcrypt) => (req, res) => {
  // await redisClient.connect();
  const { authorization } = req.headers;

  return authorization
    ? getAuthTokenId(req, res)
    : handleSignin(db, bcrypt, req, res)
        .then((data) => {
          return data.id && data.email
            ? createSessions(data)
            : Promise.reject(data);
        })
        .then((session) => res.json(session))
        .catch((err) => res.status(400).json('Error'));
};

const requireAuth = (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) {
    return res.status(401).send('Unauthorized');
  }

  //First check in Redis
  console.log('first check in redis');
  const value = redisClient.get(authorization, (err, data) => {
    console.log('getiing redisClient');
    if (err) {
      console.log(err);
    }
    if (data) {
      console.log(data);
      const reponse = JSON.parse(data);
      return res.status(200).json(reponse);
    }
    console.log('Should pass');
    return next();
  });
  console.log(value);
};

module.exports = {
  signinAuthentication,
  requireAuth,
};
