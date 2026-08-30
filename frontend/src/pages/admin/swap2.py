import os

def extract_between(text, start_str, end_str):
    start = text.find(start_str)
    if start == -1: return ""
    end = text.find(end_str, start)
    if end == -1: return ""
    return text[start:end]

def extract_until_last(text, start_str, end_str):
    start = text.find(start_str)
    if start == -1: return ""
    end = text.rfind(end_str)
    if end == -1: return ""
    return text[start:end]

def main():
    base_dir = r"c:\Users\Vimal Kumar G\Desktop\Drive master\placement-ai\frontend\src\pages\admin"
    rec_path = os.path.join(base_dir, "RecruiterPipeline.tsx")
    team_path = os.path.join(base_dir, "TeamManagement.tsx")
    
    with open(rec_path, 'r', encoding='utf-8') as f:
        rec_content = f.read()
        
    with open(team_path, 'r', encoding='utf-8') as f:
        team_content = f.read()

    # 1. We will inject the Manage Team state and modals into RecruiterPipeline.tsx
    # 2. We will remove the Manage Team state and modals from TeamManagement.tsx
    # Wait, if we move the Manage Team stuff to RecruiterPipeline, then RecruiterPipeline will have it.
    # But wait! If RecruiterPipeline gets the Manage Team stuff, and we swap routes in App.tsx, then:
    # `/admin/team` -> `<RecruiterPipeline />` (has Simple Table + Manage Team stuff)
    # `/admin/recruiters` -> `<TeamManagement />` (has Advanced Table + NO Manage Team stuff)
    
    # Let's extract Manage Team state from team_content
    team_state = extract_between(team_content, 'const [teamMembers, setTeamMembers]', 'const fileInputRef')
    
    # Let's extract Manage Team modals from team_content
    team_modals = team_content[team_content.find('{/* Manage Team Modal */}'):team_content.rfind('</div>')]

    # Let's extract the Manage Team button from team_content
    manage_team_btn = extract_between(team_content, '<button \n            onClick={() => setShowTeamModal(true)}', '</div>\n      </div>')
    manage_team_btn = '<button \n            onClick={() => setShowTeamModal(true)}' + manage_team_btn
    
    # We remove these from team_content
    new_team_content = team_content.replace(team_state, '')
    new_team_content = new_team_content.replace('fetchMembers();', '')
    new_team_content = new_team_content.replace(team_modals, '')
    new_team_content = new_team_content.replace(manage_team_btn, '')

    # We inject these into rec_content
    # Inject state
    rec_content = rec_content.replace('const [companies, setCompanies] = useState<any[]>([]);', 'const [companies, setCompanies] = useState<any[]>([]);\n  ' + team_state)
    # Inject fetchMembers to useEffect
    rec_content = rec_content.replace('fetchCompanies();\n  }, []);', 'fetchCompanies();\n    fetchMembers();\n  }, []);')
    # Inject Manage Team button next to Add Company
    rec_btn_target = '<Plus className="h-4 w-4" />\n          Add Company\n        </button>'
    rec_content = rec_content.replace(rec_btn_target, rec_btn_target + '\n        ' + manage_team_btn)
    # Inject Modals before last closing div
    rec_content = rec_content[:rec_content.rfind('</div>')] + '\n' + team_modals + '\n</div>'
    
    # Fix imports in rec_content for Manage Team
    if 'Users' not in rec_content:
        rec_content = rec_content.replace('Search, Plus', 'Search, Plus, Users, Edit2, Trash2')
        
    with open(os.path.join(base_dir, "TeamManagement_fixed.tsx"), 'w', encoding='utf-8') as f:
        f.write(new_team_content)
        
    with open(os.path.join(base_dir, "RecruiterPipeline_fixed.tsx"), 'w', encoding='utf-8') as f:
        f.write(rec_content)

if __name__ == "__main__":
    main()
