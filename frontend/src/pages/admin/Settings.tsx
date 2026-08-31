import { useState, useEffect } from 'react';
import { Save, User, Lock, Bell, CheckCircle2 } from 'lucide-react';

export function Settings() {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'notifications'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Fake user data
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklyReports: false,
    newStudentRegistrations: true,
  });

  useEffect(() => {
    // Determine user details based on current URL path and fake token
    const path = window.location.pathname;
    let defaultName = "Admin User";
    
    if (path.includes("placement_lead")) {
      defaultName = "Placement Lead";
    } else if (path.includes("manager")) {
      defaultName = "Manager";
    }

    const token = localStorage.getItem('token') || '';
    const email = token.replace('dummy_token_', '') || 'admin@gmail.com';

    setProfile({
      name: defaultName,
      email: email,
      phone: '+91 9876543210'
    });
  }, []);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Clear password fields if saving password
      if (activeTab === 'password') {
        setPasswords({ current: '', new: '', confirm: '' });
      }
    }, 800);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-1">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'profile' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <User className={`h-4 w-4 ${activeTab === 'profile' ? 'text-indigo-600' : 'text-slate-400'}`} />
            Profile Information
          </button>
          
          <button
            onClick={() => setActiveTab('password')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
              activeTab === 'password' 
                ? 'bg-indigo-50 text-indigo-700 shadow-sm' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Lock className={`h-4 w-4 ${activeTab === 'password' ? 'text-indigo-600' : 'text-slate-400'}`} />
            Security & Password
          </button>
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 md:p-8">
          
          {/* Success Banner */}
          {showSuccess && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-emerald-800">Settings saved successfully</h4>
                <p className="text-xs text-emerald-600 mt-0.5">Your preferences have been updated.</p>
              </div>
            </div>
          )}

          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">Profile Information</h2>
                <p className="text-sm text-slate-500 mt-1">Update your personal details here.</p>
              </div>
              
              <div className="grid grid-cols-1 gap-6 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                  <input 
                    type="text" 
                    value={profile.name}
                    onChange={(e) => setProfile({...profile, name: e.target.value})}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow bg-slate-50/50 hover:bg-slate-50"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                  <input 
                    type="email" 
                    value={profile.email}
                    disabled
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">Contact your administrator to change your email address.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                  <input 
                    type="tel" 
                    value={profile.phone}
                    onChange={(e) => setProfile({...profile, phone: e.target.value})}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow bg-slate-50/50 hover:bg-slate-50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Password Tab */}
          {activeTab === 'password' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="pb-4 border-b border-slate-100">
                <h2 className="text-lg font-bold text-slate-800">Security & Password</h2>
                <p className="text-sm text-slate-500 mt-1">Update your password to keep your account secure.</p>
              </div>
              
              <div className="grid grid-cols-1 gap-6 max-w-xl">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Current Password</label>
                  <input 
                    type="password" 
                    value={passwords.current}
                    onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow bg-slate-50/50 hover:bg-slate-50"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Password</label>
                  <input 
                    type="password" 
                    value={passwords.new}
                    onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow bg-slate-50/50 hover:bg-slate-50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Confirm New Password</label>
                  <input 
                    type="password" 
                    value={passwords.confirm}
                    onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow bg-slate-50/50 hover:bg-slate-50"
                  />
                </div>
              </div>
            </div>
          )}



          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-end gap-3">
            <button 
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200 flex items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
