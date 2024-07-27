const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
const axios = require("axios");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());

// Variables d'environnement
const secretKey = process.env.API_KEY;
const PORT = process.env.PORT || 3000;
const MONGODB = process.env.MONGODB;

// --------------MODEL BASE DE DONNES --------------------

mongoose.connect(MONGODB);

const User = mongoose.model("User", {
  email: String,
  token: String,
  hash: String,
  salt: String,
});

const Like = mongoose.model("Like", {
  name: String,
  image: String,
  link: String,
  token: String,
});

// --------------ROUTES--------------------

// WELCOME
app.get("/", (req, res) => {
  res.json({ message: "Hi" });
});

// RECUPERER TOUT LES PERSONNAGES

app.get("/marvel/characters", async (req, res) => {
  try {
    // Effectuer une requête GET à une API externe
    const response = await axios.get(
      `https://lereacteur-marvel-api.herokuapp.com/characters?apiKey=${secretKey}`
    );

    // Envoyer la réponse de l'API externe au client
    res.json(response.data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// RECUPERER TOUT LES COMICS

app.get("/marvel/comics", async (req, res) => {
  try {
    // Effectuer une requête GET à une API externe
    const response = await axios.get(
      `https://lereacteur-marvel-api.herokuapp.com/comics?apiKey=${secretKey}`
    );

    // Envoyer la réponse de l'API externe au client
    res.json(response.data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// RECUPERER UN PERSONNAGE EN PARTICULIER

app.get("/marvel/characters/:characterId", async (req, res) => {
  try {
    // Effectuer une requête GET à une API externe
    const response = await axios.get(
      `https://lereacteur-marvel-api.herokuapp.com/character/${req.params.characterId}?apiKey=${secretKey}`
    );

    // Envoyer la réponse de l'API externe au client
    res.json(response.data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// RECUPERER LES COMICS EN RAPPORT AVEC CE PERSONNAGE

app.get("/marvel/comics/:characterId", async (req, res) => {
  try {
    // Effectuer une requête GET à une API externe
    const response = await axios.get(
      `https://lereacteur-marvel-api.herokuapp.com/comics/${req.params.characterId}?apiKey=${secretKey}`
    );

    // Envoyer la réponse de l'API externe au client
    res.json(response.data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// RECUPERER UN COMICS EN PARTICULIER

app.get("/marvel/comic/:comicId", async (req, res) => {
  try {
    // Effectuer une requête GET à une API externe
    const response = await axios.get(
      `https://lereacteur-marvel-api.herokuapp.com/comic/${req.params.comicId}?apiKey=${secretKey}`
    );

    // Envoyer la réponse de l'API externe au client
    res.json(response.data);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// SIGNUP---------------------

app.post("/user/signup", async (req, res) => {
  try {
    // Vérifier que tous les champs requis sont présents
    if (req.body.email && req.body.password) {
      const { email, password } = req.body;

      // Vérifier que l'email n'est pas déjà pris
      const existingUser = await User.findOne({ email: email });

      if (existingUser) {
        return res.status(400).json({ message: "Cet email est déjà pris." });
      } else {
        // Générer un salt et un token
        const salt = uid2(16);
        const token = uid2(32);

        // Générer un hash
        const saltedPassword = password + salt;
        const hash = SHA256(saltedPassword).toString(encBase64);

        // Créer un nouveau user
        const newUser = new User({
          email,
          token,
          hash,
          salt,
        });

        // Enregistrer le user en BDD
        await newUser.save();

        return res.status(201).json({ token: newUser.token });
      }
    } else {
      return res.status(400).json({ message: "Missing parameters" });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// LOGIN -----------------

app.post("/user/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const userFound = await User.findOne({ email: email });
    if (!userFound) {
      return res
        .status(401)
        .json({ message: "Mot de passe ou email incorrect" });
    } else {
      const newSaltedPassword = password + userFound.salt;
      const newHash = SHA256(newSaltedPassword).toString(encBase64);
      if (newHash !== userFound.hash) {
        return res
          .status(401)
          .json({ message: "Mot de passe ou email incorrect" });
      } else {
        return res.status(200).json({ token: userFound.token });
      }
    }
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// LIKES ---------------------------

app.post("/marvel/likes", async (req, res) => {
  try {
    const { name, image, link, token } = req.body;

    // Vérifie si un like avec le nom donné existe déjà
    const existingLike = await Like.findOne({ image: image });

    if (existingLike) {
      return res.status(400).json({ message: "Ce nom a déjà été liké." });
    }

    // Crée une nouvelle entrée de like
    const newLike = new Like({
      name: name,
      image: image,
      link: link,
      token: token,
    });

    const savedLike = await newLike.save();
    return res.status(200).json(savedLike);
  } catch (err) {
    res.status(500).send({
      message: "Erreur lors de l'enregistrement des données",
      error: err,
    });
  }
});

// AFFICHES LES FAVORIES (test)

app.get("/likes/all", async (req, res) => {
  try {
    const likes = await Like.find();
    return res.status(200).json(likes);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// FILTRE LES FAVORIS EN FONCTION DU TOKEN DE L'UTILISATEUR

app.get("/likes/:token", async (req, res) => {
  try {
    const tokenValue = req.params.token;
    const likes = await Like.find({ token: tokenValue });
    return res.status(200).json(likes);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

app.delete("/likes/deleted", async (req, res) => {
  try {
    const { image } = req.body;

    const likes = await Like.findOneAndDelete({ image: image });
    return res.status(200).json(likes);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});

// 404 pour toutes les autres routes
app.all("*", (req, res) => {
  return res.status(404).json({ message: "Vous vous êtes perdu 👀" });
});

// SERVER LISTEN
app.listen(PORT, () => {
  console.log("Server has started🔥🔥🔥🔥");
});
