// app/page.tsx
import { getSets } from './lib/google-sheets';

export default async function Home() {
  // Fetching data cleanly on the server side
  const medicalSets = await getSets();

  return (
    // bg-base-200 and text-base-content adapt perfectly to your active theme (e.g., cupcake)
    <div className="min-h-screen bg-base-200 p-8 font-sans text-base-content">
      <main className="max-w-4xl mx-auto">
        
        {/* Header Area */}
        <div className="mb-8 border-b border-base-300 pb-4">
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Medical Device Inventory
          </h1>
          <p className="opacity-70 mt-1 text-sm">
            Live verification parsing from Google Sheets ("Sets" tab). Found {medicalSets.length} items.
          </p>
        </div>

        {/* Data Output Container */}
        {medicalSets.length === 0 ? (
          <div className="p-8 text-center bg-base-100 border border-base-300 rounded-xl shadow-sm">
            <p className="text-error font-medium">No data found or connection failed.</p>
            <p className="text-sm opacity-60 mt-2">
              Double-check that you shared the Google Sheet with your service account email!
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {medicalSets.map((set) => (
              <div 
                key={set.SetID} 
                className="p-5 bg-base-100 border border-base-300 rounded-xl shadow-sm flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {/* Badge layout using precise casing for interface tracking keys */}
                    <span className="badge badge-neutral font-mono text-xs font-semibold">
                      {set.SetID}
                    </span>
                    
                    {/* Using contextual DaisyUI badges based on your location values */}
                    <span className={`badge font-semibold text-xs py-2.5 ${
                      set.Location === 'WAREHOUSE' 
                        ? 'badge-info text-info-content' 
                        : 'badge-secondary text-secondary-content'
                    }`}>
                      {set.Location}
                    </span>
                  </div>
                  
                  <h2 className="text-base font-bold tracking-tight">
                    {set.SetName}
                  </h2>
                </div>

                {set.Notes && (
                  <p className="text-xs opacity-70 mt-2 italic">
                    {set.Notes}
                  </p>
                )}

                {set.DeliveryNote && (
                  <div className="mt-4 border-t border-base-300 pt-2">
                    <p className="text-xs font-mono opacity-60">
                      Note: {set.DeliveryNote}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}