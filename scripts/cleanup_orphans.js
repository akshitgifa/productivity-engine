const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupOrphans() {
    console.log("Identifying orphaned activity logs...");

    const { data: orphans, error: fetchError } = await supabase
        .from('activity_logs')
        .select('id')
        .is('task_id', null);

    if (fetchError) {
        console.error("Error fetching orphans:", fetchError);
        return;
    }

    if (!orphans || orphans.length === 0) {
        console.log("No orphaned logs found.");
        return;
    }

    console.log(`Found ${orphans.length} orphaned logs. Purging...`);

    const { error: deleteError } = await supabase
        .from('activity_logs')
        .delete()
        .is('task_id', null);

    if (deleteError) {
        console.error("Error purging orphans:", deleteError);
    } else {
        console.log("Cleanup complete. Analytics should now be accurate.");
    }
}

cleanupOrphans();
