# scripts/generate_hash.py
import bcrypt

def hash_password(password):
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

if __name__ == "__main__":
    password = input("Entrez le mot de passe à hasher: ")
    hashed = hash_password(password)
    print(f"Hash: {hashed}")