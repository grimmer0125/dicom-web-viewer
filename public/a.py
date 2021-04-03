import sys
sys.version


print("start")

if 'myVar' in globals():
    print("exist")
    print(myVar)

myVar = 10

print("end")
