import React, { useEffect, useState } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { Home, Users, User, ShieldAlert } from 'lucide-react';
import { dataService } from '../services/dataService';

const Layout = () => {
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                const profile = await dataService.getProfile();
                if (profile?.is_admin) setIsAdmin(true);
            } catch (e) {
                console.error("Error checking admin status", e);
            }
        };
        checkAdmin();
    }, []);

    return (
        <div className="app-layout">
            <main className="app-content">
                <Outlet />
            </main>

            <nav className="bottom-nav">
                <NavLink
                    to="/"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <Home size={24} />
                    <span className="nav-label">Home</span>
                </NavLink>

                <NavLink
                    to="/social"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <Users size={24} />
                    <span className="nav-label">Social</span>
                </NavLink>

                {isAdmin && (
                    <NavLink
                        to="/admin"
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    >
                        <ShieldAlert size={24} />
                        <span className="nav-label">Admin</span>
                    </NavLink>
                )}

                <NavLink
                    to="/profile"
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                    <User size={24} />
                    <span className="nav-label">Profile</span>
                </NavLink>
            </nav>
        </div>
    );
};

export default Layout;
