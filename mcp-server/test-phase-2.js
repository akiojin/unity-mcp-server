import { test } from 'node:test';
import assert from 'node:assert';
import net from 'net';

// Helper to send command and get response
async function sendCommand(client, command) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), 5000);
    
    client.once('data', (data) => {
      clearTimeout(timer);
      try {
        resolve(JSON.parse(data.toString()));
      } catch (error) {
        reject(new Error('Invalid JSON response'));
      }
    });
    
    client.write(JSON.stringify(command) + '\n');
  });
}

// Wait for Unity connection
async function waitForUnity() {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.connect(6400, 'localhost', () => {
      client.end();
      resolve();
    });
    client.on('error', () => {
      reject(new Error('Unity is not running on port 6400'));
    });
  });
}

test('Phase 2: GameObject Operations', async (t) => {
  // Wait for Unity
  await waitForUnity();
  
  await t.test('Create GameObject operations', async () => {
    const client = new net.Socket();
    await new Promise((resolve) => client.connect(6400, 'localhost', resolve));
    
    // Test 1: Create a cube
    const createCube = await sendCommand(client, {
      id: 'test-1',
      type: 'create_gameobject',
      params: {
        name: 'TestCube',
        primitiveType: 'cube',
        position: { x: 0, y: 0, z: 0 }
      }
    });
    
    assert.strictEqual(createCube.status, 'success');
    assert.strictEqual(createCube.result.name, 'TestCube');
    assert.strictEqual(createCube.result.path, '/TestCube');
    
    // Test 2: Create empty GameObject
    const createEmpty = await sendCommand(client, {
      id: 'test-2',
      type: 'create_gameobject',
      params: {
        name: 'EmptyObject',
        tag: 'Player',
        layer: 0
      }
    });
    
    assert.strictEqual(createEmpty.status, 'success');
    assert.strictEqual(createEmpty.result.tag, 'Player');
    
    // Test 3: Create child object
    const createChild = await sendCommand(client, {
      id: 'test-3',
      type: 'create_gameobject',
      params: {
        name: 'ChildSphere',
        primitiveType: 'sphere',
        parentPath: '/TestCube'
      }
    });
    
    assert.strictEqual(createChild.status, 'success');
    assert.strictEqual(createChild.result.path, '/TestCube/ChildSphere');
    
    client.end();
  });
  
  await t.test('Find GameObject operations', async () => {
    const client = new net.Socket();
    await new Promise((resolve) => client.connect(6400, 'localhost', resolve));
    
    // Find by name
    const findByName = await sendCommand(client, {
      id: 'test-find-1',
      type: 'find_gameobject',
      params: {
        name: 'Test',
        exactMatch: false
      }
    });
    
    assert.strictEqual(findByName.status, 'success');
    assert(findByName.result.count >= 2, 'Should find at least 2 objects with "Test" in name');
    
    // Find by tag
    const findByTag = await sendCommand(client, {
      id: 'test-find-2',
      type: 'find_gameobject',
      params: {
        tag: 'Player'
      }
    });
    
    assert.strictEqual(findByTag.status, 'success');
    assert(findByTag.result.count >= 1, 'Should find at least 1 object with Player tag');
    
    client.end();
  });
  
  await t.test('Modify GameObject operations', async () => {
    const client = new net.Socket();
    await new Promise((resolve) => client.connect(6400, 'localhost', resolve));
    
    // Modify position and rotation
    const modify1 = await sendCommand(client, {
      id: 'test-mod-1',
      type: 'modify_gameobject',
      params: {
        path: '/TestCube',
        position: { x: 5, y: 2, z: 0 },
        rotation: { x: 0, y: 45, z: 0 }
      }
    });
    
    assert.strictEqual(modify1.status, 'success');
    assert.strictEqual(modify1.result.position.x, 5);
    assert.strictEqual(modify1.result.position.y, 2);
    assert.strictEqual(modify1.result.modified, true);
    
    // Rename and change active state
    const modify2 = await sendCommand(client, {
      id: 'test-mod-2',
      type: 'modify_gameobject',
      params: {
        path: '/EmptyObject',
        name: 'RenamedObject',
        active: false
      }
    });
    
    assert.strictEqual(modify2.status, 'success');
    assert.strictEqual(modify2.result.name, 'RenamedObject');
    assert.strictEqual(modify2.result.isActive, false);
    
    client.end();
  });
  
  await t.test('Get hierarchy operations', async () => {
    const client = new net.Socket();
    await new Promise((resolve) => client.connect(6400, 'localhost', resolve));
    
    // Get full hierarchy
    const hierarchy = await sendCommand(client, {
      id: 'test-hier-1',
      type: 'get_hierarchy',
      params: {
        includeComponents: true,
        maxDepth: 2
      }
    });
    
    assert.strictEqual(hierarchy.status, 'success');
    assert(hierarchy.result.hierarchy.length > 0, 'Should have objects in hierarchy');
    assert(hierarchy.result.totalObjects > 0, 'Should count total objects');
    
    // Find our test cube in hierarchy
    const testCube = hierarchy.result.hierarchy.find(obj => obj.name === 'TestCube');
    assert(testCube, 'Should find TestCube in hierarchy');
    assert(testCube.children && testCube.children.length > 0, 'TestCube should have children');
    assert(testCube.components.includes('Transform'), 'Should include Transform component');
    
    client.end();
  });
  
  await t.test('Delete GameObject operations', async () => {
    const client = new net.Socket();
    await new Promise((resolve) => client.connect(6400, 'localhost', resolve));
    
    // Delete single object
    const delete1 = await sendCommand(client, {
      id: 'test-del-1',
      type: 'delete_gameobject',
      params: {
        path: '/RenamedObject'
      }
    });
    
    assert.strictEqual(delete1.status, 'success');
    assert.strictEqual(delete1.result.deletedCount, 1);
    
    // Delete multiple objects
    const delete2 = await sendCommand(client, {
      id: 'test-del-2',
      type: 'delete_gameobject',
      params: {
        paths: ['/TestCube', '/NonExistent']
      }
    });
    
    assert.strictEqual(delete2.status, 'success');
    assert.strictEqual(delete2.result.deletedCount, 1); // TestCube and its children
    assert.strictEqual(delete2.result.notFoundCount, 1); // NonExistent
    
    client.end();
  });
  
  await t.test('Error handling', async () => {
    const client = new net.Socket();
    await new Promise((resolve) => client.connect(6400, 'localhost', resolve));
    
    // Invalid primitive type
    const error1 = await sendCommand(client, {
      id: 'test-err-1',
      type: 'create_gameobject',
      params: {
        name: 'InvalidPrimitive',
        primitiveType: 'invalid'
      }
    });
    
    assert.strictEqual(error1.status, 'error');
    assert(error1.error.includes('primitiveType must be one of'));
    
    // Missing required parameter
    const error2 = await sendCommand(client, {
      id: 'test-err-2',
      type: 'modify_gameobject',
      params: {
        name: 'NoPath'
      }
    });
    
    assert.strictEqual(error2.status, 'error');
    assert(error2.error.includes('path parameter is required'));
    
    client.end();
  });
});

console.log('Phase 2 GameObject Operations Test Suite');
console.log('========================================');
console.log('Tests GameObject creation, modification, finding, hierarchy, and deletion.');
console.log('\nMake sure Unity is running with the MCP package loaded.');