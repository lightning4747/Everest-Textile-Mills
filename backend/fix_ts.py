import os
import re

files_to_fix = [
    'src/db/seed.ts',
    'src/routes/dashboard.ts',
    'src/routes/fabricRolls.ts',
    'src/routes/machines.ts',
    'src/routes/productionOrders.ts'
]

for file_path in files_to_fix:
    if not os.path.exists(file_path): continue
    with open(file_path, 'r') as f:
        content = f.read()

    # Replace references to removed fields
    content = re.sub(r'salesOrders\.fabricType', 'sql`\'Mixed\'`', content)
    content = re.sub(r'salesOrders\.colour', 'sql`\'Mixed\'`', content)
    content = re.sub(r'salesOrders\.quantityMetres', 'salesOrders.totalAmount', content) # dummy
    content = re.sub(r'salesOrders\.completedMetres', 'sql`0`', content)
    content = re.sub(r'salesOrders\.machineId', 'sql`null`', content)
    
    # In seed.ts
    content = re.sub(r'fabricType:\s*[\'"`].*?[\'"`],?', '', content)
    content = re.sub(r'colour:\s*[\'"`].*?[\'"`],?', '', content)
    content = re.sub(r'quantityMetres:\s*[\'"`].*?[\'"`],?', 'clientId: users[0].id,', content)
    content = re.sub(r'unitPrice:\s*[\'"`].*?[\'"`],?', 'totalAmount: "0",', content)
    
    # In productionOrders.ts and others formatProductionOrder
    content = re.sub(r'fabricType:\s*.*?,', '/* fabricType removed */', content)
    content = re.sub(r'colour:\s*.*?,', '/* colour removed */', content)
    content = re.sub(r'quantityMetres:\s*.*?,', '/* qt removed */', content)
    
    with open(file_path, 'w') as f:
        f.write(content)

