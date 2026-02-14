import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Manual env loading without external dependencies
const envFile = readFileSync('.env.local', 'utf8')
const env = {}
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=')
    if (key && value) {
        env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '')
    }
})

const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
)

async function migrate() {
    console.log('--- Data Migration Starting ---')

    // 1. Get the user
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()

    if (userError) {
        console.error('Error fetching users:', userError)
        return
    }

    if (users.length === 0) {
        console.error('No users found in Supabase. Please register first.')
        return
    }

    const user = users[0]
    console.log(`Found user: ${user.email} (${user.id})`)

    const SYNC_TABLES = ['projects', 'tasks', 'notes', 'activity_logs', 'subtasks', 'context_cards']

    for (const table of SYNC_TABLES) {
        console.log(`Processing table: ${table}...`)

        // Update all rows where user_id is null
        const { data, error, count } = await supabase
            .from(table)
            .update({ user_id: user.id })
            .is('user_id', null)
            .select('id')

        if (error) {
            console.error(`Error updating ${table}:`, error.message)
        } else {
            console.log(`Updated ${data?.length || 0} rows in ${table}.`)
        }
    }

    console.log('--- Migration Complete ---')
}

migrate()
