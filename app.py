from flask import Flask, render_template, request, redirect, jsonify, session
from flask_mysqldb import MySQL
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import config
from flask_mail import Mail, Message
import os
from werkzeug.utils import secure_filename
from datetime import datetime, timedelta
import math



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


from datetime import datetime, timedelta

# @app.route("/booking")
# @login_required
# def booking_page():

#     # Generate next 10 days slots
#     slots = []

#     for i in range(10):
#         date = (datetime.now() + timedelta(days=i)).strftime("%Y-%m-%d")

#         for hour in range(9, 21):  # 9 AM to 9 PM
#             time = f"{hour}:00"
#             slots.append({
#                 "date": date,
#                 "time": time
#             })

#     # Get booked slots
#     cur = mysql.connection.cursor()
#     cur.execute("SELECT slot_id, booking_date FROM bookings")
#     booked = cur.fetchall()

#     booked_set = {(str(b[1]), str(b[0])) for b in booked}

#     # Get user
#     cur.execute("SELECT name, email, phone, address FROM users WHERE id=%s", (session['user_id'],))
#     user = cur.fetchone()

#     return render_template("dashboard.html",
#                            page="booking",
#                            slots=slots,
#                            booked=booked_set,
#                            user=user)

from collections import defaultdict
from datetime import datetime, timedelta

from datetime import datetime, timedelta

from datetime import datetime, timedelta

@app.route("/booking")
@login_required
def booking_page():

    days = []

    for i in range(10):
        date_obj = datetime.now() + timedelta(days=i)
        date_str = date_obj.strftime("%Y-%m-%d")

        if i == 0:
            label = "Today"
        elif i == 1:
            label = "Tomorrow"
        else:
            label = date_obj.strftime("%a %d")

        days.append({
            "label": label,
            "date": date_str
        })

    # ✅ Get logged-in user
    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT name, email, phone, address 
        FROM users 
        WHERE id=%s
    """, (session['user_id'],))

    user = cur.fetchone()

    return render_template(
        "dashboard.html",
        page="booking",
        days=days,
        user=user
    )

@app.route("/get-booked-slots")
@login_required
def get_booked_slots():
    date = request.args.get("date")

    cur = mysql.connection.cursor()
    cur.execute("""
        SELECT slot_id FROM bookings WHERE booking_date=%s
    """, (date,))

    data = cur.fetchall()

    slots = [row[0] for row in data]

    return jsonify(slots)
# @app.route("/book", methods=["POST"])
# @login_required
# def book():

#     name = request.form.get('name')
#     email = request.form.get('email')
#     phone = request.form.get('phone')
#     address = request.form.get('address')
#     remarks = request.form.get('remarks')
#     latitude = request.form.get('latitude')
#     longitude = request.form.get('longitude')
#     slot_id = request.form.get('slot_id')
#     booking_date = request.form.get('booking_date')

#     cur = mysql.connection.cursor()

#     # 🚫 Prevent duplicate booking
#     cur.execute("""
#         SELECT id FROM bookings
#         WHERE booking_date=%s AND slot_id=%s
#     """, (booking_date, slot_id))

#     if cur.fetchone():
#         return "❌ Slot already booked!"

#     # 👤 Get user
#     user_id = session['user_id']

#     tech_id = get_nearest_technician(float(latitude), float(longitude), booking_date, slot_id)


#     # ✅ Insert booking
#     cur.execute("""
#         INSERT INTO bookings(user_id, slot_id, booking_date, payment_status)
#         VALUES(%s,%s,%s,%s)
#     """, (user_id, slot_id, booking_date, "Pending"))

#     mysql.connection.commit()

#     # 📧 SEND EMAIL
#     try:
#         msg = Message(
#             "Booking Confirmed",
#             sender=app.config['MAIL_USERNAME'],
#             recipients=[email]
#         )

#         msg.body = f"""
# Hello {name},

# Your booking is confirmed.

# Date: {booking_date}
# Slot: {slot_id}

# Thank you!
#         """

#         mail.send(msg)
#     except Exception as e:
#         print("Mail Error:", e)

#     return redirect("/booking?success=1")

import requests  # 🔥 ADD THIS

@app.route("/book", methods=["POST"])
@login_required
def book():

    name = request.form.get('name')
    email = request.form.get('email')
    phone = request.form.get('phone')
    address = request.form.get('address')
    remarks = request.form.get('remarks')
    latitude = request.form.get('latitude')
    longitude = request.form.get('longitude')
    slot_id = request.form.get('slot_id')
    booking_date = request.form.get('booking_date')

    cur = mysql.connection.cursor()

    # 🚫 Duplicate check
    cur.execute("""
        SELECT id FROM bookings
        WHERE booking_date=%s AND slot_id=%s
    """, (booking_date, slot_id))

    if cur.fetchone():
        return "❌ Slot already booked!"

    user_id = session['user_id']

    # 🔥 AUTO ASSIGN TECHNICIAN
    tech_id = get_nearest_technician(
        float(latitude), float(longitude),
        booking_date, slot_id
    )

    if not tech_id:
        return "❌ No technician available"

    # ✅ INSERT WITH TECHNICIAN
    cur.execute("""
        INSERT INTO bookings(user_id, slot_id, booking_date, payment_status, technician_id)
        VALUES(%s,%s,%s,%s,%s)
    """, (user_id, slot_id, booking_date, "Pending", tech_id))

    mysql.connection.commit()
    print("DEBUG:", slot_id, booking_date, latitude, longitude)

    #    # 📧 SEND EMAIL
    #     try:
    #         msg = Message(
    #             "Booking Confirmed",
    #             sender=app.config['MAIL_USERNAME'],
    #             recipients=[email]
    #         )

    #         msg.body = f"""
    # Hello {name},

    # Your booking is confirmed.

    # Date: {booking_date}
    # Slot: {slot_id}

    # Thank you!
    #         """

    #         mail.send(msg)
    #     except Exception as e:
    #         print("Mail Error:", e)


    return redirect("/booking?success=1")


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

@app.route("/admin/bookings")
@admin_required
def admin_bookings():

    cur = mysql.connection.cursor()

    cur.execute("""
        SELECT b.id, u.name, b.booking_date, b.slot_id, b.payment_status
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        ORDER BY b.id DESC
    """)

    bookings = cur.fetchall()

    return render_template("admin_bookings.html", bookings=bookings)

@app.route("/update-status", methods=["POST"])
def update_status():

    booking_id = request.form.get("id")
    status = request.form.get("status")

    cur = mysql.connection.cursor()

    cur.execute("""
        UPDATE bookings SET payment_status=%s WHERE id=%s
    """, (status, booking_id))

    mysql.connection.commit()

    return redirect("/admin/bookings")

import math

def calculate_distance(lat1, lon1, lat2, lon2):
    return math.sqrt((lat1 - lat2)**2 + (lon1 - lon2)**2)


# def get_nearest_technician(user_lat, user_lon, booking_date, slot_id):

#     cur = mysql.connection.cursor()

#     # Get available technicians
#     cur.execute("SELECT id, latitude, longitude FROM technician WHERE status='Available'")
#     techs = cur.fetchall()

#     nearest = None
#     min_dist = float("inf")

#     for t in techs:
#         tech_id, lat, lon = t

#         # ❌ check if already booked at same time
#         cur.execute("""
#             SELECT id FROM bookings
#             WHERE technician_id=%s AND booking_date=%s AND slot_id=%s
#         """, (tech_id, booking_date, slot_id))

#         if cur.fetchone():
#             continue  # busy

#         dist = calculate_distance(user_lat, user_lon, lat, lon)

#         if dist < min_dist:
#             min_dist = dist
#             nearest = tech_id

#     return nearest



# def get_nearest_technician(user_lat, user_lon, booking_date, slot_id):

#     cur = mysql.connection.cursor()

#     # ✅ ONLY ACTIVE TECHNICIANS
#     cur.execute("""
#         SELECT id, latitude, longitude 
#         FROM technician 
#         WHERE status='Available' AND active=1
#     """)
#     techs = cur.fetchone()
#     return tech[0] if tech else None
# def get_nearest_technician(user_lat, user_lon, booking_date, slot_id):

#     cur = mysql.connection.cursor()

#     cur.execute("""
#         SELECT id FROM technician 
#         WHERE status='Available' AND active=1
#         LIMIT 1
#     """)

#     tech = cur.fetchone()

#     return tech[0] if tech else None
#     best_tech = None
#     min_time = float("inf")
# def get_nearest_technician(user_lat, user_lon, booking_date, slot_id):

#     cur = mysql.connection.cursor()

#     cur.execute("""
#         SELECT id FROM technician 
#         WHERE status='Available' AND active=1
#         LIMIT 1
#     """)

#     tech = cur.fetchone()

#     return tech[0] if tech else None


#     for tech in techs:
#         tech_id, lat, lon = tech

#         # ❌ skip busy technician
#         cur.execute("""
#             SELECT id FROM bookings
#             WHERE technician_id=%s AND booking_date=%s AND slot_id=%s
#         """, (tech_id, booking_date, slot_id))

#         if cur.fetchone():
#             continue

#         # ✅ GOOGLE MAP DISTANCE API
#         url = f"https://maps.googleapis.com/maps/api/distancematrix/json?origins={user_lat},{user_lon}&destinations={lat},{lon}&key=YOUR_API_KEY"

#         res = requests.get(url).json()

#         try:
#             duration = res['rows'][0]['elements'][0]['duration']['value']
#         except:
#             continue

#         if duration < min_time:
#             min_time = duration
#             best_tech = tech_id

#     return best_tech

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

    return redirect("/admin/bookings")

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

@app.route("/get-technician/<int:id>")
def get_technician(id):
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM technician WHERE id=%s", (id,))
    t = cur.fetchone()

    return jsonify({
        "id": t[0],
        "name": t[1],
        "phone1": t[2],
        "street": t[5]
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



# ---------------------------
# RUN
# ---------------------------
if __name__ == "__main__":
    app.run(debug=True)