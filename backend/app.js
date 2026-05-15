const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();


// ========================================
// MIDDLEWARES
// ========================================
app.use(cors());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);


// ========================================
// STATIC FOLDER
// ========================================
app.use(
  "/uploads",
  express.static(
    path.join(
      __dirname,
      "uploads"
    )
  )
);


// ========================================
// HEALTH CHECK
// ========================================
app.get("/", (req, res) => {
  res.send(
    "Mirchi Backend Running 🚀"
  );
});


// ========================================
// ADMIN ROUTES
// ========================================
const adminAuthRoutes = require(
  "./routes/admin/auth.routes"
);

const adminUserRoutes = require(
  "./routes/admin/user.routes"
);

const movieRoutes = require(
  "./routes/admin/movie.routes"
);

const seriesRoutes = require(
  "./routes/admin/series.routes"
);

const episodeRoutes = require(
  "./routes/admin/episode.routes"
);


const movieUserRoutes = require("./routes/user/movie.routes");
const seriesUserRoutes = require("./routes/user/series.routes");
const contentAdminRoutes = require("./routes/admin/content.routes");
const contentUserRoutes = require("./routes/user/content.routes");

app.use(
  "/api/admin/auth",
  adminAuthRoutes
);

app.use(
  "/api/admin/users",
  adminUserRoutes
);

app.use(
  "/api/admin/movies",
  movieRoutes
);

app.use(
  "/api/admin/series",
  seriesRoutes
);

app.use(
  "/api/admin/episodes",
  episodeRoutes
);

app.use(
  "/api/admin/content",
  contentAdminRoutes
);


// ========================================
// USER ROUTES
// ========================================
const authRoutes = require(
  "./routes/user/auth.routes"
);

const userRoutes = require(
  "./routes/user/user.routes"
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/user",
  userRoutes
);

app.use("/api/movies", movieUserRoutes);

app.use("/api/series", seriesUserRoutes);

app.use("/api/content", contentUserRoutes);

//legal routes for admin
const adminLegal = require("./routes/admin/legal.routes");
app.use("/api/admin/legal", adminLegal);

//legal routes for user
const userLegal = require("./routes/user/legal.routes");
app.use("/api/legal", userLegal);


//help routes
const helpAdminRoutes = require("./routes/admin/help.routes");
const helpUserRoutes = require("./routes/user/help.routes");

app.use("/api/admin/help", helpAdminRoutes);
app.use("/api/help", helpUserRoutes);

//rating routes
const ratingRoutes = require("./routes/user/rating.routes");
app.use("/api/rating", ratingRoutes);

//plan routes
const adminPlanRoutes = require("./routes/admin/plan.routes");
const userPlanRoutes = require("./routes/user/plan.routes");

app.use("/api/admin/plan", adminPlanRoutes);
app.use("/api/plan", userPlanRoutes);

//promo routes
const adminPromoRoutes = require("./routes/admin/promo.routes");
app.use("/api/admin/promo", adminPromoRoutes);
const userPromoRoutes = require("./routes/user/promo.routes");
app.use("/api/promo", userPromoRoutes);

//voucher routes for admin
const adminVoucherRoutes = require("./routes/admin/voucher.routes");
app.use("/api/admin/voucher", adminVoucherRoutes);

//voucher routes for user
const userVoucherRoutes = require("./routes/user/voucher.routes");
app.use("/api/voucher", userVoucherRoutes);

//subscription routes
const adminSubscriptionRoutes = require("./routes/admin/subscription.routes");
const userSubscriptionRoutes = require("./routes/user/subscription.routes");

app.use("/api/admin/subscription", adminSubscriptionRoutes);
app.use("/api/subscription", userSubscriptionRoutes);

//watchlist routes
const watchlistRoutes = require("./routes/user/watchlist.routes");
app.use("/api/watchlist", watchlistRoutes);

//notification routes
const adminNotificationRoutes = require("./routes/admin/notification.routes");
const userNotificationRoutes = require("./routes/user/notification.routes");
app.use("/api/admin/notifications", adminNotificationRoutes);
app.use("/api/notifications", userNotificationRoutes);

// ================Razor Pay===============
// const paymentRoutes = require("./routes/user/payment.routes");
// app.use("/api/payment", paymentRoutes);

// ========================================
// EXPORT
// ========================================
module.exports = app;