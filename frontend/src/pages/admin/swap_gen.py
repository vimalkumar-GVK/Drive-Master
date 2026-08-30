import re
import os

def main():
    base_dir = r"c:\Users\Vimal Kumar G\Desktop\Drive master\placement-ai\frontend\src\pages\admin"
    rec_path = os.path.join(base_dir, "RecruiterPipeline.tsx")
    team_path = os.path.join(base_dir, "TeamManagement.tsx")
    
    with open(rec_path, 'r', encoding='utf-8') as f:
        rec_content = f.read()
        
    with open(team_path, 'r', encoding='utf-8') as f:
        team_content = f.read()
        
    # --- EXTRACT TEAM MANAGEMENT LOGIC (from team_content) ---
    # 1. State
    team_state_match = re.search(r'(const \[teamMembers, setTeamMembers\].*?role: "Manager"\n\s+});)', team_content, re.DOTALL)
    team_state = team_state_match.group(1) if team_state_match else ""
    
    # 2. Functions
    team_funcs_match = re.search(r'(const fetchMembers = \(\) => \{.*?alert\("Failed to delete member"\);\s+\}\n\s+\};)', team_content, re.DOTALL)
    team_funcs = team_funcs_match.group(1) if team_funcs_match else ""
    
    # 3. UseEffect logic (fetchMembers) - we'll just insert it manually.
    
    # 4. Modals
    team_modals_match = re.search(r'(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-\[60\] p-4">.*?)(?=\s*</div>\s*\);\s*\})', team_content, re.DOTALL)
    # Actually the modals start with: {/* Team Modal */} or similar
    team_modals_match = re.search(r'(\{/\* (?:Manage )?Team Modal \*/\}.*?)(?=\s*</div>\s*\);\s*\})', team_content, re.DOTALL)
    team_modals = team_modals_match.group(1) if team_modals_match else ""
    
    # 5. Header and Stats Cards
    header_stats_match = re.search(r'(\{/\* Top Header \*/\}.*?\{/\* Main Companies Table Container \*/\})', team_content, re.DOTALL)
    header_stats = header_stats_match.group(1) if header_stats_match else ""
    
    # --- EXTRACT RECRUITER PIPELINE HEADER (from rec_content) ---
    rec_header_match = re.search(r'(<div className="flex items-center justify-between">\s*<h1 className="text-3xl font-bold tracking-tight">Recruiters Pipeline</h1>.*?</div>)', rec_content, re.DOTALL)
    rec_header = rec_header_match.group(1) if rec_header_match else ""
    
    print("Extracted snippets lengths:", len(team_state), len(team_funcs), len(team_modals), len(header_stats), len(rec_header))
    
    # Now, let's create the NEW TeamManagement.tsx (using rec_content as base)
    new_team = rec_content
    # Rename component
    new_team = new_team.replace("export function RecruiterPipeline() {", "export function TeamManagement() {")
    # Replace header with header_stats
    new_team = new_team.replace(rec_header, header_stats.replace('{/* Main Companies Table Container */}', ''))
    # Inject state
    new_team = new_team.replace('const [companies, setCompanies] = useState<any[]>([]);', f'const [companies, setCompanies] = useState<any[]>([]);\n  {team_state}')
    # Inject functions
    new_team = new_team.replace('const fetchCompanies = async () => {', f'{team_funcs}\n\n  const fetchCompanies = async () => {{')
    # Add fetchMembers to useEffect
    new_team = new_team.replace('fetchCompanies();\n  }, []);', 'fetchCompanies();\n    fetchMembers();\n  }, []);')
    # Append modals before closing div
    new_team = re.sub(r'(\s*</div>\s*\);\s*\})', f'\n\n      {team_modals}\\1', new_team)
    # Fix missing Users icon import if needed
    if 'Users' not in new_team:
        new_team = new_team.replace('Search, Plus', 'Search, Plus, Users, Building2, Flame, CheckCircle, GraduationCap')
    
    # Now, let's create the NEW RecruiterPipeline.tsx (using team_content as base)
    new_rec = team_content
    # Rename component
    new_rec = new_rec.replace("export function TeamManagement() {", "export function RecruiterPipeline() {")
    # Replace header_stats with rec_header
    new_rec = new_rec.replace(header_stats, rec_header + '\n\n      {/* Main Companies Table Container */}  \n')
    # Remove state
    new_rec = new_rec.replace(team_state, "")
    # Remove functions
    new_rec = new_rec.replace(team_funcs, "")
    # Remove fetchMembers from useEffect
    new_rec = new_rec.replace('fetchMembers();', '')
    # Remove modals
    new_rec = new_rec.replace(team_modals, "")
    
    with open(os.path.join(base_dir, "TeamManagement_new.tsx"), 'w', encoding='utf-8') as f:
        f.write(new_team)
        
    with open(os.path.join(base_dir, "RecruiterPipeline_new.tsx"), 'w', encoding='utf-8') as f:
        f.write(new_rec)
        
    print("Done generating new files")

if __name__ == "__main__":
    main()
