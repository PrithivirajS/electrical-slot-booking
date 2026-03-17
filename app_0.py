from flask import Flask, render_template, request, redirect
from flask_mysqldb import MySQL
import config
from flask_mail import Mail, Message

app = Flask(__name__)

app.config['MYSQL_HOST'] = config.MYSQL_HOST
app.config['MYSQL_USER'] = config.MYSQL_USER
app.config['MYSQL_PASSWORD'] = config.MYSQL_PASSWORD
app.config['MYSQL_DB'] = config.MYSQL_DB

mysql = MySQL(app)

app.config['MAIL_SERVER'] = config.MAIL_SERVER
app.config['MAIL_PORT'] = config.MAIL_PORT
app.config['MAIL_USERNAME'] = config.MAIL_USERNAME
app.config['MAIL_PASSWORD'] = config.MAIL_PASSWORD
app.config['MAIL_USE_TLS'] = True

mail = Mail(app)

@app.route("/")
def index():
    cur = mysql.connection.cursor()
    cur.execute("SELECT * FROM slots")
    slots = cur.fetchall()
    return render_template("index.html", slots=slots)

@app.route("/book", methods=["POST"])
def book():
    name = request.form['name']
    email = request.form['email']
    phone = request.form['phone']
    slot_id = request.form['slot_id']

    cur = mysql.connection.cursor()
    cur.execute("INSERT INTO users(name,email,phone) VALUES(%s,%s,%s)", (name,email,phone))
    user_id = cur.lastrowid

    cur.execute("INSERT INTO bookings(user_id,slot_id,payment_status) VALUES(%s,%s,%s)",
                (user_id,slot_id,"Pending"))

    mysql.connection.commit()

    msg = Message("Slot Booking Confirmation",
                  sender=app.config['MAIL_USERNAME'],
                  recipients=[email])
    msg.body = "Your electrical service slot has been booked successfully."
    try:
        mail.send(msg)
    except:
        pass

    return redirect("/")

@app.route("/admin")
def admin():
    return render_template("admin.html")

@app.route("/create_slot", methods=["POST"])
def create_slot():
    date = request.form['date']
    time = request.form['time']
    available = request.form['available']

    cur = mysql.connection.cursor()
    cur.execute("INSERT INTO slots(slot_date,slot_time,available) VALUES(%s,%s,%s)",
                (date,time,available))
    mysql.connection.commit()

    return redirect("/admin")

if __name__ == "__main__":
    app.run(debug=True)