require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");

const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleweare/authMiddleware");
const Post = require("./models/Post");
const User = require("./models/user");

const app = express();
const port = process.env.PORT || 3000;

/* ===================== MIDDLEWARE ===================== */

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.set("view engine", "ejs");

/* ===================== STATIC FOLDER ===================== */

// IMPORTANT: OneDrive interferes with file writes in synced folders
// Using temp directory OUTSIDE OneDrive to avoid conflicts
// OneDrive Location: C:\Users\rajgu\OneDrive\Desktop\MERNTest
// Upload Location: C:\Users\rajgu\AppData\Local\Temp\mern_uploads (local, NOT synced)
const uploadDir = path.join(os.tmpdir(), "mern_uploads");

console.log("Upload directory:", uploadDir);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("Created upload directory");
}

app.use("/uploads", express.static(uploadDir));

/* ===================== MULTER CONFIG ===================== */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Verify directory exists before attempting write
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      console.log(`Uploading to: ${uploadDir}`);
      cb(null, uploadDir);
    } catch (err) {
      console.error("Destination error:", err);
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const filename = Date.now() + path.extname(file.originalname);
    console.log(`Filename: ${filename}`);
    cb(null, filename);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    console.log(`File type received: ${file.mimetype}`);
    
    // Only allow image files
    const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      console.log("File type accepted");
      cb(null, true);
    } else {
      console.log("File type rejected");
      cb(new Error("Only image files are allowed"));
    }
  }
});

/* ===================== AUTH ROUTES ===================== */

// Root redirect - MUST come before app.use("/", authRoutes)
app.get("/", (req, res) => {
  console.log("ROOT ROUTE CALLED - Redirecting to login");
  res.redirect("/login");
});

app.use("/", authRoutes);

/* ===================== FEED ROUTE (WITH PAGINATION) ===================== */

app.get("/feed", authMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4;
    const skip = (page - 1) * limit;

    const totalPosts = await Post.countDocuments();
    const totalPages = Math.ceil(totalPosts / limit);

    const posts = await Post.find()
      .populate("user")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log("\nFEED PAGE LOAD");
    console.log("Current user:", req.user._id, req.user.username);
    console.log("Posts loaded:", posts.length);
    posts.forEach((post, idx) => {
      console.log(`  Post ${idx}: user=${post.user._id} (${post.user.username}), canEdit=${post.user._id.toString() === req.user._id.toString()}`);
    });

    res.render("feed", {
      user: req.user,
      posts,
      currentPage: page,
      totalPages
    });

  } catch (err) {
    console.error(err);
    res.send("Error loading feed");
  }
});

/* ===================== CREATE POST ===================== */

app.post("/create-post", authMiddleware, upload.single("image"), async (req, res) => {

  try {
    console.log("\nCREATE POST REQUEST");
    console.log("Current user ID:", req.user._id);
    console.log("BODY:", req.body);
    console.log("FILE:", req.file);

    // Check if Multer successfully received the file
    if (!req.file) {
      console.error("NO FILE received in req.file");
      return res.status(400).send("File not received. Make sure you selected an image and form has enctype='multipart/form-data'");
    }

    const filePath = path.join(uploadDir, req.file.filename);
    console.log(`Checking if file exists at: ${filePath}`);
    
    // Double-check file exists on disk
    if (!fs.existsSync(filePath)) {
      console.error(`FILE NOT FOUND ON DISK: ${filePath}`);
      console.error(`Checking directory contents:`, fs.readdirSync(uploadDir));
      return res.status(500).send("File upload failed - file not saved to disk. Try again.");
    }

    console.log(` File confirmed on disk: ${req.file.filename}`);

    // Create post in database ONLY after confirming file exists
    const post = await Post.create({
      caption: req.body.caption,
      image: req.file.filename,
      user: req.user._id
    });

    console.log("Post saved to database:", post._id);
    console.log("   User ID in post:", post.user);
    res.redirect("/feed");

  } catch (err) {
    console.error(" Create post error:", err);
    res.status(500).send("Error creating post: " + err.message);
  }
});
/* ===================== DELETE POST (OWNER ONLY) ===================== */

app.post("/delete-post/:id", authMiddleware, async (req, res) => {
  try {
    console.log("\nDELETE POST REQUEST");
    console.log("Post ID:", req.params.id);
    console.log("Current user ID:", req.user._id);

    const post = await Post.findById(req.params.id).populate("user");

    if (!post) {
      console.error(" Post not found:", req.params.id);
      return res.send("Post not found");
    }

    console.log("Post user ID:", post.user._id);
    console.log("Comparing:", post.user._id.toString(), "===", req.user._id.toString());

    if (post.user._id.toString() !== req.user._id.toString()) {
      console.error(" Not authorized - user mismatch");
      return res.send("Not authorized");
    }

    // Delete file from temp directory
    if (post.image) {
      const imagePath = path.join(uploadDir, post.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
        console.log("Image file deleted:", post.image);
      }
    }

    await Post.findByIdAndDelete(req.params.id);
    console.log("Post deleted successfully");
    res.redirect("/feed");

  } catch (err) {
    console.error("Delete error:", err);
    res.send("Error deleting post: " + err.message);
  }
});

/* ===================== EDIT POST - DISPLAY FORM ===================== */

app.get("/edit-post/:id", authMiddleware, async (req, res) => {
  try {
    console.log("\nEDIT POST PAGE");
    console.log("Post ID:", req.params.id);
    console.log("Current user ID:", req.user._id);

    const post = await Post.findById(req.params.id).populate("user");

    if (!post) {
      return res.status(404).send("Post not found");
    }

    if (post.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).send("Not authorized to edit this post");
    }

    res.render("editpost", {
      user: req.user,
      post
    });

  } catch (err) {
    console.error("Edit post page error:", err);
    res.status(500).send("Error loading edit page: " + err.message);
  }
});

/* ===================== UPDATE POST ===================== */

app.post("/update-post/:id", authMiddleware, upload.single("image"), async (req, res) => {
  try {
    console.log("\nUPDATE POST REQUEST");
    console.log("Post ID:", req.params.id);
    console.log("Current user ID:", req.user._id);
    console.log("New caption:", req.body.caption);
    console.log("New image file:", req.file ? req.file.filename : "No file");

    const post = await Post.findById(req.params.id).populate("user");

    if (!post) {
      return res.status(404).send("Post not found");
    }

    if (post.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).send("Not authorized to edit this post");
    }

    // Update caption
    if (req.body.caption) {
      post.caption = req.body.caption;
      console.log("Caption updated");
    }

    // Update image if new one was uploaded
    if (req.file) {
      console.log("New image received, verifying file exists...");
      
      const filePath = path.join(uploadDir, req.file.filename);
      if (!fs.existsSync(filePath)) {
        console.error("New image file not found on disk");
        return res.status(500).send("Image upload failed - file not saved to disk");
      }

      // Delete old image if it exists
      if (post.image) {
        const oldImagePath = path.join(uploadDir, post.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
          console.log("Old image deleted:", post.image);
        }
      }

      post.image = req.file.filename;
      console.log("Image updated:", req.file.filename);
    }

    // Save updated post
    await post.save();
    console.log("Post updated successfully");

    res.redirect("/feed");

  } catch (err) {
    console.error("Update post error:", err);
    res.status(500).send("Error updating post: " + err.message);
  }
});

/* ===================== MULTER ERROR HANDLER ===================== */

// Add this BEFORE the MongoDB connection
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error("Multer Error:", err);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).send("File too large. Maximum size: 5MB");
    }
    return res.status(400).send("Upload Error: " + err.message);
  } else if (err) {
    console.error("Error:", err);
    return res.status(400).send("Error: " + err.message);
  }
  next();
});

/* ===================== DEBUG ROUTE ===================== */

app.get("/debug/upload-dir", (req, res) => {
  const dirContents = fs.existsSync(uploadDir) ? fs.readdirSync(uploadDir) : [];
  res.json({
    uploadDir,
    uploaded_files: dirContents,
    file_count: dirContents.length,
    temp_dir: os.tmpdir()
  });
});

// Search photos by current user
app.get("/debug/my-photos", authMiddleware, async (req, res) => {
  try {
    const userPosts = await Post.find({ user: req.user._id }).populate("user");
    
    res.json({
      user_id: req.user._id,
      username: req.user.username,
      total_posts: userPosts.length,
      posts: userPosts.map(post => ({
        post_id: post._id,
        caption: post.caption,
        image_filename: post.image,
        image_url: `/uploads/${post.image}`,
        createdAt: post.createdAt,
        physical_location: path.join(uploadDir, post.image)
      }))
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

// Search photos by username
app.get("/debug/user-photos/:username", async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      return res.json({ error: "User not found" });
    }
    
    const userPosts = await Post.find({ user: user._id }).populate("user");
    
    res.json({
      user_id: user._id,
      username: user.username,
      total_posts: userPosts.length,
      posts: userPosts.map(post => ({
        post_id: post._id,
        caption: post.caption,
        image_filename: post.image,
        image_url: `/uploads/${post.image}`,
        createdAt: post.createdAt,
        physical_location: path.join(uploadDir, post.image)
      }))
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

/* ===================== MONGODB CONNECT ===================== */

mongoose.connect(process.env.MONGO_URI)
.then(() => {
  console.log("MongoDB Connected");

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
})
.catch(err => console.error("MongoDB Error:", err));