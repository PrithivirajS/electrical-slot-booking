from flask import Flask, render_template, request, redirect, jsonify, session
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import config
from flask_mail import Mail, Message
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = "supersecretkey"

# ---------------------------
# MySQL Configuration
# ---------------------------
app.config['MYSQL_HOST'] = config.MYSQL_HOST
app.config['MYSQL_USER'] = config.MYSQL_USER
app.config['MYSQL_PASSWORD'] = config.MYSQL_PASSWORD
app.config['MYSQL_DB'] = config.MYSQL_DB

mysql = MySQL(app)

# ---------------------------
# Mail Configuration
# ---------------------------
app.config['MAIL_SERVER'] = config.MAIL_SERVER
app.config['MAIL_PORT'] = config.MAIL_PORT
app.config['MAIL_USERNAME'] = config.MAIL_USERNAME
app.config['MAIL_PASSWORD'] = config.MAIL_PASSWORD
app.config['MAIL_USE_TLS'] = True

mail = Mail(app)

# ---------------------------
# AUTH DECORATORS
# ---------------------------
def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return redirect("/login")
        return f(*args, **kwargs)
    return wrapper


def admin_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'role' not in session or session['role'] != "admin":
            return redirect("/login")
        return f(*args, **kwargs)
    return wrapper

# ---------------------------
# ROUTES
# ---------------------------

# Home
@app.route("/")
def index():
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM slots")
    slots = cur.fetchall()
    return render_template("index.html", slots=slots)


# Register
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        name = request.form['name']
        email = request.form['email']
        phone = request.form['phone']
        password = generate_password_hash(request.form['password'])

        # ✅ Backend validation
        if not phone.isdigit() or len(phone) != 10:
            return "Invalid mobile number (must be 10 digits)"

        cur = mysql.connection.cursor()

        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            return "User already exists"

        cur.execute(
            "INSERT INTO users(name,email,phone,password,role) VALUES(%s,%s,%s,%s,%s)",
            (name, email, phone, password, "user")
        )
        print(name, email, phone, password)
        mysql.connection.commit()

        return redirect("/login")

    return render_template("register.html")


# Login
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form['email']
        password = request.form['password']

        cur = mysql.connection.cursor()
        cur.execute("SELECT id, password, role FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

        if user and check_password_hash(user[1], password):
            session['user_id'] = user[0]
            session['role'] = user[2]

            if user[2] == "admin":
                return redirect("/dashboard")
            else:
                return redirect("/")

        return "Invalid credentials"

    return render_template("login.html")



# Logout
@app.route("/logout")
def logout():
    session.clear()
    return redirect("/login")

# Forget Password
@app.route("/forgot-password", methods=["GET", "POST"])
def forgot_password():
    if request.method == "POST":
        email = request.form['email']

        cur = mysql.connection.cursor()
        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

        if not user:
            return "Email not found"

        # Simple reset link (for now)
        reset_link = f"http://127.0.0.1:5000/reset-password/{email}"

        try:
            msg = Message(
                "Password Reset",
                sender=app.config['MAIL_USERNAME'],
                recipients=[email]
            )
            msg.body = f"Click to reset your password: {reset_link}"
            mail.send(msg)
        except Exception as e:
            print("Mail Error:", e)

        return "Reset link sent to your email"

    return render_template("forgot_password.html")

# Rest Password 
@app.route("/reset-password/<email>", methods=["GET", "POST"])
def reset_password(email):
    if request.method == "POST":
        new_password = generate_password_hash(request.form['password'])

        cur = mysql.connection.cursor()
        cur.execute(
            "UPDATE users SET password=%s WHERE email=%s",
            (new_password, email)
        )
        mysql.connection.commit()

        return redirect("/login")

    return render_template("reset_password.html")


# Book Slot
@app.route("/book", methods=["POST"])
@login_required
def book():
    name = request.form['name']
    email = request.form['email']
    phone = request.form['phone']
    slot_id = request.form['slot_id']   

    cur = mysql.connection.cursor()

    cur.execute(
        "INSERT INTO users(name,email,phone) VALUES(%s,%s,%s)",
        (name, email, phone)
    )
    user_id = cur.lastrowid

    cur.execute(
        "INSERT INTO bookings(user_id,slot_id,payment_status) VALUES(%s,%s,%s)",
        (user_id, slot_id, "Pending")
    )

    mysql.connection.commit()

    try:
        msg = Message(
            "Slot Booking Confirmation",
            sender=app.config['MAIL_USERNAME'],
            recipients=[email]
        )
        msg.body = "Your electrical service slot has been booked successfully."
        mail.send(msg)
    except Exception as e:
        print("Mail Error:", e)

    return redirect("/")


# Admin Page
@app.route("/admin")
@admin_required
def admin():
    return render_template("admin.html")


# Create Slot
@app.route("/create_slot", methods=["POST"])
@admin_required
def create_slot():
    date = request.form['date']
    time = request.form['time']
    available = request.form['available']

    cur = mysql.connection.cursor()
    cur.execute(
        "INSERT INTO slots(slot_date,slot_time,available) VALUES(%s,%s,%s)",
        (date, time, available)
    )
    mysql.connection.commit()

    return redirect("/admin")


# Dashboard
# @app.route("/dashboard")
# @admin_required
# def dashboard():
#     return render_template("dashboard.html")

# @app.route("/dashboard")
# @admin_required
# def dashboard():
#     return render_template(
#         "dashboard.html",
#         user_name=session.get('user_id'),
#         user_role=session.get('role')
#   )

@app.route("/dashboard")
@admin_required
def dashboard():
    cur = mysql.connection.cursor()
    cur.execute("SELECT name, email FROM users WHERE id=%s", (session['user_id'],))
    user = cur.fetchone()

    return render_template(
        "dashboard.html",
        user_name=user[0],
        user_email=user[1]
    )


# Dashboard API
@app.route("/admin/data")
@admin_required
def admin_data():
    cur = mysql.connection.cursor()

    cur.execute("""
        SELECT u.name, s.slot_time, b.payment_status
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN slots s ON b.slot_id = s.id
    """)

    rows = cur.fetchall()

    bookings = []
    total = len(rows)
    confirmed = 0
    pending = 0

    for r in rows:
        status = r[2]

        if status == "Paid":
            confirmed += 1
        else:
            pending += 1

        bookings.append({
            "name": r[0],
            "time": r[1],
            "status": status
        })

    return jsonify({
        "total": total,
        "confirmed": confirmed,
        "pending": pending,
        "bookings": bookings
    })

# Dashboard profile
# @app.route("/admin/profile")
# @admin_required
# def admin_profile():
#     user_id = session['user_id']

#     cur = mysql.connection.cursor()
#     cur.execute("SELECT name, email FROM users WHERE id=%s", (user_id,))
#     user = cur.fetchone()

#     return jsonify({
#         "name": user[0],
#         "email": user[1]
#     })

@app.route("/admin/profile")
@admin_required
def admin_profile():
    user_id = session['user_id']

    cur = mysql.connection.cursor()
    cur.execute("SELECT name, email, profile_image FROM users WHERE id=%s", (user_id,))
    user = cur.fetchone()

    return jsonify({
        "name": user[0],
        "email": user[1],
        "image": user[2]
    })

# @app.route("/users")
# @admin_required
# def users():
#     cur = mysql.connection.cursor()
#     cur.execute("SELECT * FROM users")
#     users = cur.fetchall()
#     return render_template("users.html", users=users)

@app.route("/users")
@admin_required
def users():

    search = request.args.get("search", "").strip()
    page = int(request.args.get("page", 1))

    limit = 5
    offset = (page - 1) * limit

    cur = mysql.connection.cursor()

    if search:
        like = f"%{search}%"

        # ✅ COUNT FIRST
        cur.execute("""
            SELECT COUNT(*) FROM users
            WHERE name LIKE %s OR email LIKE %s OR phone LIKE %s
        """, (like, like, like))
        total = cur.fetchone()[0]

        # ✅ THEN FETCH DATA
        cur.execute("""
            SELECT * FROM users
            WHERE name LIKE %s OR email LIKE %s OR phone LIKE %s
            ORDER BY name ASC
            LIMIT %s OFFSET %s
        """, (like, like, like, limit, offset))

    else:
        # ✅ COUNT FIRST
        cur.execute("SELECT COUNT(*) FROM users")
        total = cur.fetchone()[0]

        # ✅ THEN FETCH DATA
        cur.execute("""
            SELECT * FROM users
            ORDER BY name ASC
            LIMIT %s OFFSET %s
        """, (limit, offset))

    users = cur.fetchall()

    total_pages = (total // limit) + (1 if total % limit else 0)

    return render_template(
        "users.html",
        users=users,
        page=page,
        total_pages=total_pages,
        search=search
    )

UPLOAD_FOLDER = "static/uploads"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


from werkzeug.utils import secure_filename


@app.route("/upload-profile", methods=["POST"])
@login_required
def upload_profile():

    if 'profile' not in request.files:
        return redirect("/dashboard")

    file = request.files['profile']

    if file.filename == "":
        return redirect("/dashboard")

    filename = secure_filename(file.filename)

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    user_id = session['user_id']

    cur = mysql.connection.cursor()
    cur.execute(
        "UPDATE users SET profile_image=%s WHERE id=%s",
        (filename, user_id)
    )
    mysql.connection.commit()

    return redirect("/dashboard")

UPLOAD_FOLDER = "static/uploads"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Create folder if not exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


@app.route("/update-user", methods=["POST"])
@admin_required
def update_user():
    data = request.get_json()

    user_id = data['id']
    phone = data['phone']
    role = data['role']

    cur = mysql.connection.cursor()
    cur.execute(
        "UPDATE users SET phone=%s, role=%s WHERE id=%s",
        (phone, role, user_id)
    )
    mysql.connection.commit()

    return {"status": "success"}

@app.route("/delete-user", methods=["POST"])
@admin_required
def delete_user():
    data = request.get_json()
    user_id = data['id']

    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM users WHERE id=%s", (user_id,))
    mysql.connection.commit()

    return {"status": "deleted"}

@app.route("/add-user", methods=["POST"])
@admin_required
def add_user():

    data = request.get_json()

    name = data['name']
    email = data['email']
    phone = data['phone']
    role = data['role']

    cur = mysql.connection.cursor()

    # Check if email exists
    cur.execute("SELECT id FROM users WHERE email=%s", (email,))
    if cur.fetchone():
        return {"error": "User already exists"}

    cur.execute(
        "INSERT INTO users(name,email,phone,role,password) VALUES(%s,%s,%s,%s,%s)",
        (name, email, phone, role, "")  # password empty or default
    )

    mysql.connection.commit()

    return {"status": "success"}

# ---------------------------
# RUN
# ---------------------------
if __name__ == "__main__":
    app.run(debug=True)