app.get("/feed", authMiddleware, async (req, res) => {

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

  res.render("feed", {
    user: req.user,
    posts,
    currentPage: page,
    totalPages
  });

});