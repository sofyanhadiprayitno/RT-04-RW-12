import re, os, json

with open("/tmp/main.js") as f:
    main_code = f.read()

with open("/tmp/admin.js") as f:
    admin_code = f.read()

main_apis = set(re.findall(r"/api/[a-zA-Z0-9_\-\/]+", main_code))
admin_apis = set(re.findall(r"/api/[a-zA-Z0-9_\-\/]+", admin_code))

print("MAIN APIS:", sorted(list(main_apis)))
print("ADMIN APIS:", sorted(list(admin_apis)))

# Check login credentials or default users mentioned in admin.js
print("\nAdmin strings / logins / defaults:")
for match in re.finditer(r"(admin|pengurus|ketua|bendahara|sekretaris|password|user)", admin_code, re.I):
    start = max(0, match.start() - 60)
    end = min(len(admin_code), match.end() + 60)
    snippet = admin_code[start:end].replace('\n', ' ')
    if 'default' in snippet.lower() or 'pass' in snippet.lower() or 'demo' in snippet.lower():
        print("  Snippet:", snippet)
        break
