
---

# 🔐 Authentication Flow

### Signup Process
1. User enters username, email, password
2. Password hashed using `bcrypt`
3. User saved in MongoDB

### Login Process
1. User enters email & password
2. Password compared using `bcrypt.compare`
3. JWT token generated
4. Token stored in cookies
5. User redirected to `/feed`

### Middleware Protection
- `authMiddleware` verifies JWT
- If token invalid → redirect to login
- If valid → allow access

---

# 📸 Post System Logic

### Create Post
1. User submits caption + image
2. Multer stores image in `public/uploads`
3. Post saved in MongoDB
4. Post linked to logged-in user

### Feed Display
- Fetch posts using:
  - `.find()`
  - `.populate("user")`
  - `.sort({ createdAt: -1 })`
  - `.skip()`
  - `.limit()`

### Owner Restriction
Only the user who created the post can delete it.

Comparison: