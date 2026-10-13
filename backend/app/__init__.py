import os
from flask import Flask, jsonify
from flask_cors import CORS
from config import Config, integration_status
from extensions import db, jwt, limiter

def create_app(config=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config:
        app.config.update(config)
    os.makedirs(app.config["UPLOAD_DIR"], exist_ok=True)
    CORS(app, resources={r"/api/*": {"origins": "*"}},
         allow_headers=["Content-Type", "Authorization", "Access-Control-Allow-Private-Network", "Access-Control-Allow-Origin"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"])
    db.init_app(app); jwt.init_app(app); limiter.init_app(app)

    @app.before_request
    def handle_options():
        from flask import request
        if request.method == "OPTIONS":
            resp = jsonify(ok=True)
            resp.headers["Access-Control-Allow-Origin"] = "*"
            resp.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Access-Control-Allow-Private-Network"
            resp.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
            resp.headers["Access-Control-Allow-Private-Network"] = "true"
            return resp, 200

    @app.after_request
    def after_request_cors(response):
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Access-Control-Allow-Private-Network"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Private-Network"] = "true"
        return response

    from app.routes.auth import bp as auth_bp
    from app.routes.contacts import bp as contacts_bp
    from app.routes.sos import bp as sos_bp
    from app.routes.modules import bp as mod_bp
    for b in (auth_bp, contacts_bp, sos_bp, mod_bp):
        app.register_blueprint(b, url_prefix="/api")

    @app.get("/api/status")
    def status():
        return jsonify(ok=True, integrations=integration_status())

    @app.errorhandler(404)
    def nf(e): return jsonify(error="Not found"), 404
    @app.errorhandler(429)
    def rl(e): return jsonify(error="Too many requests. Please slow down."), 429
    @app.errorhandler(500)
    def se(e): return jsonify(error="Internal server error"), 500

    @jwt.unauthorized_loader
    def unauth(r): return jsonify(error="Authentication required"), 401
    @jwt.expired_token_loader
    def expired(h, p): return jsonify(error="Session expired. Please log in again."), 401
    return app
