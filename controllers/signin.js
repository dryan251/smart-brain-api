const jwt = require("jsonwebtoken");
const redis = require("redis");

//setup redis
const redisClient = redis.createClient({
  url: process.env.REDIS_URI,
});

redisClient.connect();

const handleSignin = (db, bcrypt, req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return Promise.reject("incorrect form submission");
  }
  return db
    .select("email", "hash")
    .from("login")
    .where("email", "=", email)
    .then((data) => {
      const isValid = bcrypt.compareSync(password, data[0].hash);
      if (isValid) {
        return db
          .select("*")
          .from("users")
          .where("email", "=", email)
          .then((user) => user[0])
          .catch((err) => Promise.reject("unable to get user"));
      } else {
        return Promise.reject("wrong credentials");
      }
    })
    .catch((err) => res.status(400).json("wrong credentials"));
};

const getAuthTokenId = (req, res) => {
  const { authorization } = req.headers;
  return redisClient.get(authorization, (err, reply) => {
    if (err || !reply) {
      return res.status(400).json("Unauthorized");
    }
    return res.json({ id: reply });
  });
};

const signToken = (email) => {
  const jwtPayload = { email };
  return jwt.sign(jwtPayload, "My_JWT_SuperSecret", { expiresIn: "4 days" });
};

const setToken = async (key, value) => {
  return Promise.resolve(redisClient.set(key, value));
};

const createSessions = (user) => {
  //JWT Token, return user data
  const { id, email } = user;
  const token = signToken(email);
  return setToken(token, id)
    .then(() => ({ success: "true", userId: id, token }))
    .catch(console.log);
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
        .catch((err) => res.status(400).json("Eroare"));
};

module.exports = {
  signinAuthentication: signinAuthentication,
};
