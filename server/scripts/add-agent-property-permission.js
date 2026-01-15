const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const Role = require('../models/Role');

async function addAgentPropertyPermission() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the agent role
    const agentRole = await Role.findOne({ name: 'agent' });

    if (!agentRole) {
      console.error('Agent role not found!');
      process.exit(1);
    }

    console.log('\nCurrent agent role permissions:');
    console.log(agentRole.permissions);

    // Add properties.create permission if not already present
    const permissionToAdd = 'properties.create';
    
    if (agentRole.permissions.includes(permissionToAdd)) {
      console.log(`\n✓ Agent role already has '${permissionToAdd}' permission`);
    } else {
      agentRole.permissions.push(permissionToAdd);
      await agentRole.save();
      console.log(`\n✓ Added '${permissionToAdd}' permission to agent role`);
    }

    console.log('\nUpdated agent role permissions:');
    console.log(agentRole.permissions);

    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addAgentPropertyPermission();
