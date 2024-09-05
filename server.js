const express = require("express");
const dotenv = require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const userRoute = require("./routes/userRoute");
const productRoute = require("./routes/productRoute");
const categoryRoute = require("./routes/categoryRoute");
const brandRoute = require("./routes/brandRoute");
const couponRoute = require("./routes/couponRoute")
const orderRoute = require("./routes/orderRoute");
const errorHandler = require("./middleware/errorMiddleware");
const transactionRoute = require("./routes/transactionRoute")

const app = express();



// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
// app.use(express.urlencoded({ extended: false}));
app.use(
cors({
    origin: ["http://localhost:3000" ],
    credentials: true,
})
);
app.use("/api/transaction",transactionRoute);
app.use(express.json());

// Routes
app.use("/api/users",userRoute);
app.use("/api/products",productRoute);
app.use("/api/category",categoryRoute);
app.use("/api/brand",brandRoute);
app.use("/api/coupon", couponRoute);
app.use("/api/order", orderRoute);

app.get("/", (req,res) => {
    res.send("HOme Page...")
})

// Error middleware
app.use(errorHandler);
const PORT = process.env.PORT || 5000

mongoose.set("strictQuery", false);
mongoose.connect(process.env.MONGO_URI)
.then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    })
})
.catch((err) => console.log(err))
