from flask import Flask, render_template, request, redirect, jsonify, session
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import config
from flask_mail import Mail, Message
import os
import requests
import random
import string
import random
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import math
from collections import defaultdict



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
        cur.execute("SELECT id, password, role, name FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

        if user and check_password_hash(user[1], password):
            # ✅ Store session
            session['user_id'] = user[0]
            session['role'] = user[2]
            session['user_name'] = user[3]

            # ✅ ALWAYS redirect to dashboard (FIXED)
            return redirect("/dashboard")

        # ❌ Send error to UI (NOT plain text)
        return render_template("login.html", error="❌ Invalid email or password")

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




# @app.route("/get-booked-slots")
# @login_required
# def get_booked_slots():

#     date = request.args.get("date")
#     tech_id = request.args.get("technician_id")

#     cur = mysql.connection.cursor()

#     # 🚫 No technician → disable all slots
#     if not tech_id:
#         return jsonify(list(range(1, 13)))  # slots 1–12

#     # ✅ Get booked slots for selected technician
#     cur.execute("""
#         SELECT slot_id FROM bookings
#         WHERE booking_date=%s AND technician_id=%s
#     """, (date, tech_id))

#     data = cur.fetchall()
#     slots = [row[0] for row in data]

#     return jsonify(slots)

@app.route("/get-booked-slots")
@login_required
def get_booked_slots():

    date = request.args.get("date")
    tech_id = request.args.get("technician_id")

    cur = mysql.connection.cursor()

    # 🔥 Get ALL slots with booking count
    cur.execute("""
        SELECT 
            s.id,
            s.slot_time,
            s.max_capacity,
            COUNT(b.id) as booked_count
        FROM slots s
        LEFT JOIN bookings b
            ON s.id = b.slot_id
            AND b.booking_date = %s
            AND b.technician_id = %s
        GROUP BY s.id
        ORDER BY s.id
    """, (date, tech_id if tech_id else 0))

    data = cur.fetchall()

    result = []
    for row in data:
        result.append({
            "id": row[0],
            "time": row[1],
            "capacity": row[2],
            "booked": row[3]
        })

    return jsonify(result)


def generate_booking_code(name):
    return f"ELE{name[:3].upper()}{random.randint(10000,99999)}"


@app.route("/book", methods=["POST"])
@login_required
def book():

    cur = mysql.connection.cursor()

    name = request.form.get('name')
    phone = request.form.get('phone')
    slot_id = request.form.get('slot_id')
    booking_date = request.form.get('booking_date')
    tech_id = request.form.get('technician_id')
    service_id = request.form.get("service_id")

    user_id = session['user_id']

    # ✅ VALIDATION
    if not slot_id or not booking_date:
        return "❌ Please select date and slot"

    if not tech_id:
        return "❌ Please select technician"

    if not service_id:
        return "❌ Service not selected"

    # ✅ DUPLICATE CHECK (USER + SLOT + SERVICE)
    # cur.execute("""
    #     SELECT id FROM bookings
    #     WHERE user_id=%s
    #     AND booking_date=%s
    #     AND slot_id=%s
    #     AND service_id=%s
    # """, (user_id, booking_date, slot_id, service_id))

    cur.execute("""
    SELECT COUNT(*) 
    FROM bookings
    WHERE booking_date=%s
    AND slot_id=%s
    AND technician_id=%s
""", (booking_date, slot_id, tech_id))

    count = cur.fetchone()[0]

    cur.execute("SELECT max_capacity FROM slots WHERE id=%s", (slot_id,))
    capacity = cur.fetchone()[0]

    if cur.fetchone():
        return "❌ Slot fully booked!"

    # ✅ BOOKING CODE
    booking_code = generate_booking_code(name)

    # ✅ INSERT
    cur.execute("""
        INSERT INTO bookings
        (booking_code, user_id, slot_id, booking_date, payment_status, technician_id, service_id)
        VALUES(%s,%s,%s,%s,%s,%s,%s)
    """, (
        booking_code,
        user_id,
        slot_id,
        booking_date,
        "Pending",
        tech_id,
        service_id
    ))

    mysql.connection.commit()

    booking_id = cur.lastrowid

    return redirect(f"/booking-success/{booking_id}")

@app.route("/booking-success/<int:booking_id>")
@login_required
def booking_success(booking_id):

    cur = mysql.connection.cursor()

    # cur.execute("""
    #     SELECT 
    #         b.id,
    #         b.booking_date,
    #         s.slot_time,
    #         b.payment_status,
    #         sv.name,
    #         sv.price
    #     FROM bookings b
    #     JOIN slots s ON b.slot_id = s.id
    #     LEFT JOIN services sv ON b.service_id = sv.id
    #     WHERE b.id=%s AND b.user_id=%s
    # """, (booking_id, session['user_id']))

    cur.execute("""
        SELECT 
            b.id,
            b.booking_date,
            s.slot_time,
            b.payment_status,
            sv.name,
            sv.price,
            u.name,
            u.phone,
            t.name
        FROM bookings b
        JOIN slots s ON b.slot_id = s.id
        LEFT JOIN services sv ON b.service_id = sv.id
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN technician t ON b.technician_id = t.id
        WHERE b.id=%s AND b.user_id=%s
    """, (booking_id, session['user_id']))

    data = cur.fetchone()

    if not data:
        return f"❌ Booking not found for user {session['user_id']}"

    return render_template("booking_success.html", booking=data)

@app.route("/get-tech-booked-slots")
@login_required
def get_tech_booked_slots():

    date = request.args.get("date")
    tech_id = request.args.get("tech_id")

    cur = mysql.connection.cursor()

    cur.execute("""
        SELECT slot_id FROM bookings
        WHERE booking_date=%s AND technician_id=%s
    """, (date, tech_id))

    data = cur.fetchall()

    slots = [row[0] for row in data]

    return jsonify(slots)

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


@app.route("/home")
@login_required
def home():
    return render_template(
        "home.html",
        user_name=session.get("user_name")
    )

@app.route("/dashboard")
@login_required
def dashboard():
    cur = mysql.connection.cursor()
    cur.execute("SELECT name, email FROM users WHERE id=%s", (session['user_id'],))
    user = cur.fetchone()

    return render_template(
        "dashboard.html",
        user_name=user[0],
        user_email=user[1],
        role=session.get('role')   # optional
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

    limit = 15
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

    cur = mysql.connection.cursor()
    cur.execute(
        "UPDATE users SET name=%s, email=%s, phone=%s, role=%s WHERE id=%s",
        (data['name'], data['email'], data['phone'], data['role'], user_id)
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


from datetime import datetime, timedelta


@app.route("/booking")
@login_required
def booking():

    service_id = request.args.get("service_id")

    if not service_id:
        return "❌ Service ID missing"

    cur = mysql.connection.cursor()

    cur.execute("""
        SELECT id, name, price
        FROM services
        WHERE id=%s
    """, (service_id,))

    selected_service = cur.fetchone()

    return render_template(
        "booking.html",
        selected_service=selected_service
    )
    
@app.route("/update-status", methods=["POST"])
def update_status():

    booking_id = request.form.get("id")
    status = request.form.get("status")

    cur = mysql.connection.cursor()

    cur.execute("""
        UPDATE bookings SET payment_status=%s WHERE id=%s
    """, (status, booking_id))

    mysql.connection.commit()

    return redirect("//booking")

import math

def calculate_distance(lat1, lon1, lat2, lon2):
    return math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2)




def get_nearest_technician(user_lat, user_lon, booking_date, slot_id):

    cur = mysql.connection.cursor()

    # ✅ Get all active technicians
    cur.execute("""
        SELECT id, latitude, longitude 
        FROM technician 
        WHERE status='Available' AND active=1
    """)

    techs = cur.fetchall()

    best_tech = None
    min_dist = float("inf")

    for tech in techs:
        tech_id, lat, lon = tech

        # 🚫 Skip if already booked for same slot
        cur.execute("""
            SELECT id FROM bookings
            WHERE technician_id=%s AND booking_date=%s AND slot_id=%s
        """, (tech_id, booking_date, slot_id))

        if cur.fetchone():
            continue

        # ✅ Simple distance calculation
        try:
            dist = (float(user_lat) - float(lat))**2 + (float(user_lon) - float(lon))**2
        except:
            continue

        if dist < min_dist:
            min_dist = dist
            best_tech = tech_id

    return best_tech

@app.route("/toggle-tech", methods=["POST"])
def toggle_tech():

    tech_id = request.form.get("tech_id")

    cur = mysql.connection.cursor()

    cur.execute("""
        UPDATE technicians 
        SET active = CASE WHEN active=1 THEN 0 ELSE 1 END
        WHERE id=%s
    """, (tech_id,))

    mysql.connection.commit()

    return redirect("/booking")

@app.route("/update-tech-location", methods=["POST"])
def update_location():

    tech_id = request.json['id']
    lat = request.json['lat']
    lng = request.json['lng']

    cur = mysql.connection.cursor()
    cur.execute("""
        UPDATE technicians SET latitude=%s, longitude=%s WHERE id=%s
    """, (lat, lng, tech_id))

    mysql.connection.commit()

    return {"status": "updated"}

@app.route("/get-tech-location")
def get_tech_location():

    cur = mysql.connection.cursor()

    cur.execute("""
        SELECT latitude, longitude 
        FROM technician 
        WHERE active=1 LIMIT 1
    """)

    tech = cur.fetchone()

    if not tech:
        return jsonify({})

    return jsonify({
        "lat": tech[0],
        "lng": tech[1]
    })

@app.route("/add_technician", methods=["POST"])
@admin_required
def add_technician():
    try:
        cur = mysql.connection.cursor()

        name = request.form.get("name")
        phone1 = request.form.get("phone1")
        phone2 = request.form.get("phone2")

        address = request.form.get("flat")
        street = request.form.get("street")
        post = request.form.get("post")
        taluk = request.form.get("taluk")
        district = request.form.get("district")
        pincode = request.form.get("pincode")

        education = request.form.get("education")
        proof_type = request.form.get("govtType")
        proof_file = request.form.get("govtNumber")

        resume_file = request.files.get("resume")
        photo_file = request.files.get("photo")

        resume_path = None
        photo_path = None

        # Resume (PDF)
        if resume_file and resume_file.filename != "":
            filename = secure_filename(resume_file.filename)
            resume_path = f"documents/{filename}"
            resume_file.save(os.path.join(app.config['DOC_FOLDER'], filename))

        # Photo
        if photo_file and photo_file.filename != "":
            filename = secure_filename(photo_file.filename)
            photo_path = f"uploads/{filename}"
            photo_file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

        # ✅ DUPLICATE CHECK
        cur.execute("""
            SELECT id FROM technician
            WHERE name=%s AND phone1=%s AND street=%s
        """, (name, phone1, street))

        if cur.fetchone():
            return jsonify({"error": "Technician already exists"}), 400

        # ✅ INSERT (MATCH DB STRUCTURE)
        cur.execute("""
            INSERT INTO technician
            (name, phone1, phone2, address, street, post, taluk, district, pincode,
             education, proof_type, proof_file, resume_path, photo_path, status, active)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'Available',1)
        """, (
            name, phone1, phone2, address, street, post,
            taluk, district, pincode,
            education, proof_type, proof_file,
            resume_path, photo_path
        ))

        mysql.connection.commit()

        return jsonify({"status": "success"})

    except Exception as e:
        print("ERROR:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/technicians")
@admin_required
def technicians():
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM technician ORDER BY id DESC")
    techs = cur.fetchall()

    return render_template("technicians.html", technicians=techs)

UPLOAD_FOLDER = "static/uploads"
DOC_FOLDER = "static/documents"

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['DOC_FOLDER'] = DOC_FOLDER

# Create folders if not exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DOC_FOLDER, exist_ok=True)

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg'}
ALLOWED_DOC_EXTENSIONS = {'pdf'}

def allowed_file(filename, allowed_types):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_types


@app.route('/get-technician/<int:id>')
def get_technician(id):

    cur = mysql.connection.cursor()

    cur.execute("SELECT * FROM technician WHERE id=%s", (id,))
    t = cur.fetchone()

    return jsonify({
        "id": t[0],
        "name": t[1],
        "phone1": t[2],
        "phone2": t[3],
        "flat": t[4],
        "street": t[5],
        "area": t[6],
        "status": t[16],
        "active": t[17]
    })

@app.route("/update-technician", methods=["POST"])
def update_technician():

    id = request.form.get("id")
    name = request.form.get("name")
    phone1 = request.form.get("phone1")

    cur = mysql.connection.cursor()
    cur.execute("""
        UPDATE technician SET name=%s, phone1=%s
        WHERE id=%s
    """, (name, phone1, id))

    mysql.connection.commit()
    return jsonify({"status": "updated"})

@app.route("/delete-technician", methods=["POST"])
def delete_technician():
    data = request.get_json()
    id = data['id']

    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM technician WHERE id=%s", (id,))
    mysql.connection.commit()

    return {"status": "deleted"}

@app.route("/toggle-technician", methods=["POST"])
def toggle_technician():
    data = request.get_json()
    id = data['id']

    cur = mysql.connection.cursor()
    cur.execute("""
        UPDATE technician
        SET active = CASE WHEN active=1 THEN 0 ELSE 1 END
        WHERE id=%s
    """, (id,))
    mysql.connection.commit()

    return {"status": "updated"}

@app.route("/technician/bookings")
def technician_bookings():

    tech_id = session.get("user_id")  # or technician session

    cur = mysql.connection.cursor()

    cur.execute("""
        SELECT b.id, u.name, b.booking_date, b.slot_id, b.payment_status
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        WHERE b.technician_id=%s
        ORDER BY b.booking_date DESC
    """, (tech_id,))

    data = cur.fetchall()

    return render_template("technician_bookings.html", bookings=data)

@app.route("/get-dates")
@login_required
def get_dates():

    start = int(request.args.get("start", 0))

    days = []
    for i in range(start, start + 7):
        d = datetime.now() + timedelta(days=i)
        days.append(d.strftime("%Y-%m-%d"))

    return jsonify(days)

@app.route('/search-tech')
def search_tech():
    q = request.args.get('q')

    cur = mysql.connection.cursor()
    # cur.execute("SELECT * FROM technician WHERE name LIKE %s", ('%'+q+'%',))
    cur.execute("""SELECT * FROM technician WHERE name LIKE %s OR phone1 LIKE %s """, ('%' + q + '%', '%' + q + '%'))
    data = cur.fetchall()

    result = []
    for t in data:
        result.append({
            "id": t[0],
            "name": t[1],
            "phone": t[2]
        })

    return jsonify(result)

@app.route("/customers")
@login_required
def customers():

    search = request.args.get("search", "").strip()
    page = int(request.args.get("page", 1))

    limit = 10
    offset = (page - 1) * limit

    cur = mysql.connection.cursor()

    if search:
        like = f"%{search}%"

        # ✅ Optimized search (NAME priority)
        cur.execute("""
            SELECT COUNT(*) FROM customers
            WHERE user_id=%s AND (
                full_name LIKE %s OR
                mobile LIKE %s OR
                email LIKE %s
            )
        """, (session['user_id'], like, like, like))

        total = cur.fetchone()[0]

        cur.execute("""
            SELECT id, full_name, mobile, email, city
            FROM customers
            WHERE user_id=%s AND (
                full_name LIKE %s OR
                mobile LIKE %s OR
                email LIKE %s
            )
            ORDER BY 
                CASE 
                    WHEN full_name LIKE %s THEN 1
                    WHEN mobile LIKE %s THEN 2
                    ELSE 3
                END,
                full_name ASC
            LIMIT %s OFFSET %s
        """, (
            session['user_id'],
            like, like, like,
            f"{search}%", f"{search}%",
            limit, offset
        ))

    else:
        cur.execute("""
            SELECT COUNT(*) FROM customers
            WHERE user_id=%s
        """, (session['user_id'],))

        total = cur.fetchone()[0]

        cur.execute("""
            SELECT id, full_name, mobile, email, city
            FROM customers
            WHERE user_id=%s
            ORDER BY id DESC
            LIMIT %s OFFSET %s
        """, (session['user_id'], limit, offset))

    data = cur.fetchall()

    total_pages = (total // limit) + (1 if total % limit else 0)

    return render_template(
        "customers.html",
        customers=data,
        page=page,
        total_pages=total_pages,
        search=search
    )


@app.route("/add-customer", methods=["POST"])
@login_required
def add_customer():

    data = request.get_json()
    cur = mysql.connection.cursor()

    if data.get("id"):   # ✅ UPDATE
        cur.execute("""
            UPDATE customers
            SET full_name=%s, mobile=%s, email=%s, city=%s
            WHERE id=%s
        """, (
            data['full_name'],
            data['mobile'],
            data['email'],
            data['city'],
            data['id']
        ))
    else:  # ✅ INSERT
        cur.execute("""
            INSERT INTO customers
            (user_id, full_name, mobile, email, city)
            VALUES (%s,%s,%s,%s,%s)
        """, (
            session['user_id'],
            data['full_name'],
            data['mobile'],
            data['email'],
            data['city']
        ))

    mysql.connection.commit()
    return {"status": "success"}

@app.route("/get-customers")
@login_required
def get_customers():

    cur = mysql.connection.cursor()

    cur.execute("""
        SELECT id, full_name, mobile, email, city
        FROM customers
        WHERE user_id=%s
        ORDER BY id DESC
    """, (session['user_id'],))

    data = cur.fetchall()

    result = []
    for r in data:
        result.append({
            "id": r[0],
            "name": r[1],
            "mobile": r[2],
            "email": r[3],
            "city": r[4]
        })

    return jsonify(result)

@app.route("/delete-customer", methods=["POST"])
@login_required
def delete_customer():

    data = request.get_json()
    cust_id = data['id']

    cur = mysql.connection.cursor()
    cur.execute("DELETE FROM customers WHERE id=%s", (cust_id,))
    mysql.connection.commit()

    return {"status": "deleted"}

@app.route('/search-customer')
def search_customer():

    q = request.args.get('q')

    cur = mysql.connection.cursor()

    cur.execute("""
        SELECT id, name, phone, email, address, city, state, pincode, latitude, longitude
        FROM users
        WHERE name LIKE %s OR phone LIKE %s
    """, ('%' + q + '%', '%' + q + '%'))

    data = cur.fetchall()

    result = []
    for c in data:
        result.append({
            "id": c[0],
            "name": c[1],
            "phone": c[2],
            "email": c[3],
            "address": c[4],
            "city": c[5],
            "state": c[6],
            "pincode": c[7],
            "lat": c[8],
            "lng": c[9]
        })

    return jsonify(result)


@app.route("/api/services")
@login_required
def get_services():

    category = request.args.get("category")
    search = request.args.get("search", "")

    cur = mysql.connection.cursor()

    query = "SELECT id, name, category, price, rating, bookings, icon, description FROM services WHERE active=1"
    params = []

    if category and category != "All":
        query += " AND category=%s"
        params.append(category)

    if search:
        query += " AND name LIKE %s"
        params.append(f"%{search}%")

    query += " ORDER BY id DESC"

    cur.execute(query, tuple(params))
    data = cur.fetchall()

    result = []
    for s in data:
        result.append({
            "id": s[0],
            "name": s[1],
            "category": s[2],
            "price": s[3],
            "rating": s[4],
            "bookings": s[5],
            "icon": s[6],
            "description": s[7]
        })

    return jsonify(result)

import random

def generate_booking_code(name):
    prefix = "ELE"
    name_part = (name[:3]).upper() if name else "USR"
    rand = random.randint(10000, 99999)
    return f"{prefix}{name_part}{rand}"


# ---------------------------
# RUN
# ---------------------------
if __name__ == "__main__":
    app.run(debug=True)