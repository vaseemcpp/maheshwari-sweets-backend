const express = require("express");
const router = express.Router();
const {registerUser,loginUser,logout,getUser,getLoginStatus, updateUser,updatePhoto,saveCart,getCart,
addToWishlist,removeFromWishlist,getWishlist} = require('../controllers/userController');
const {protect} = require("../middleware/authMiddleware");

router.post("/register",registerUser);
router.post("/login",loginUser);
router.get("/logout", logout);
router.get("/getUser",protect, getUser);
router.get("/getLoginStatus",getLoginStatus);
router.patch("/updateUser", protect, updateUser);
router.patch("/updatePhoto", protect, updatePhoto);

// Cart
router.patch("/saveCart",protect,saveCart);
router.get("/getCart",protect,getCart);

// Wishlist
router.post("/addToWishlist",protect,addToWishlist);
router.get("/getWishlist",protect,getWishlist);
router.put("/wishlist/:productId",protect,removeFromWishlist);

module.exports = router;