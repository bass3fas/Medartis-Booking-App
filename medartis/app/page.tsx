import { getSetsData } from './lib/google-sheets';

export default async function Home() {
  // Fetching data cleanly on the server side
  const medicalSets = await getSetsData();

  return (
    <div className="min-h-screen bg-zinc-50 p-8 font-sans dark:bg-black text-zinc-900 dark:text-zinc-100">
      <main className="max-w-4xl mx-auto">
        
        {/* Header Area */}
        <div className="mb-8 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <h1 className="text-3xl font-bold tracking-tight">
            Medical Device Inventory
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Live verification parsing from Google Sheets ("Sets" tab). Found {medicalSets.length} items.
          </p>
        </div>

        {/* Data Output Container */}
        {medicalSets.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-zinc-900 border rounded-xl">
            <p className="text-red-500 font-medium">No data found or connection failed.</p>
            <p className="text-sm text-zinc-500 mt-2">
              Double-check that you shared the Google Sheet with your service account email!
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {medicalSets.map((set) => (
              <div 
                key={set.id} 
                className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded">
                      {set.id}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      set.location === 'WAREHOUSE' 
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' 
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    }`}>
                      {set.location}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-white">
                    {set.name}
                  </h2>
                </div>

                {set.deliveryNote && (
                  <p className="text-xs text-zinc-400 mt-3 border-t border-zinc-100 dark:border-zinc-800 pt-2 font-mono">
                    Note: {set.deliveryNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}