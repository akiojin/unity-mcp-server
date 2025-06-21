# Fix Newtonsoft.Json Missing Reference

The error occurs because Unity hasn't installed the Newtonsoft.Json package even though it's declared as a dependency.

## Solution Steps:

### 1. Check Your Project's Packages/manifest.json

Open your Unity project's `Packages/manifest.json` file and ensure it includes:

```json
{
  "dependencies": {
    "com.unity.nuget.newtonsoft-json": "3.2.1",
    // ... other packages
  }
}
```

### 2. Force Unity to Resolve Packages

Try these in order:

1. **In Unity**: 
   - Go to `Help > Reset Packages to defaults`
   - Or `Window > Package Manager > ⚙️ (gear icon) > Reset Packages to defaults`

2. **Manual Cache Clear**:
   - Close Unity
   - Delete these folders in your project:
     - `Library/PackageCache`
     - `Library/ScriptAssemblies`
   - Reopen Unity

3. **Direct Package Manager Install**:
   - Open Package Manager (`Window > Package Manager`)
   - Click `+` → `Add package by name...`
   - Enter: `com.unity.nuget.newtonsoft-json`
   - Version: `3.2.1`
   - Click `Add`

### 3. Alternative: Use Unity's Built-in JsonUtility

If Newtonsoft.Json continues to cause issues, we can modify the code to use Unity's built-in JsonUtility instead. This would require changing:
- Command.cs
- Response.cs
- All test files

### 4. Verify Installation

Once installed, you should see:
- `Packages/Newtonsoft Json - Unity` in your Project window
- No more CS0246 errors

## If Still Having Issues:

1. Check Unity version (requires 2020.3+)
2. Try creating a new empty Unity project and testing there
3. Check Unity console for any package resolution errors