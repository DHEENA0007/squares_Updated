
import { configurationService } from './src/services/configurationService';

async function listConfigs() {
    try {
        const filters = await configurationService.getAllFilterConfigurations();
        console.log(JSON.stringify(filters, null, 2));
    } catch (error) {
        console.error(error);
    }
}

listConfigs();
