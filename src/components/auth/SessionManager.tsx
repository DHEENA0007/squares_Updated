import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { settingsService } from '@/services/settingsService';
import { toast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const SessionManager = () => {
    const { user, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [showTimeoutDialog, setShowTimeoutDialog] = useState(false);

    // Refs to track state without triggering re-renders
    const lastActivityRef = useRef<number>(Date.now());
    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
    const warningTimeoutIdRef = useRef<NodeJS.Timeout | null>(null);
    const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Default timeout in minutes (fallback)
    const DEFAULT_TIMEOUT = 30;

    // Get timeout from settings or use default
    const getSessionTimeout = async () => {
        try {
            const response = await settingsService.getSettings();
            if (response.success && response.data.settings.security) {
                return response.data.settings.security.sessionTimeout;
            }
        } catch (error) {
            console.error('Failed to fetch session timeout settings:', error);
        }
        return DEFAULT_TIMEOUT;
    };

    const handleLogout = () => {
        setShowTimeoutDialog(false);
        logout();
        toast({
            title: "Session Expired",
            description: "You have been logged out due to inactivity.",
            variant: "destructive",
        });
        navigate('/v3/login');
    };

    const resetTimer = () => {
        lastActivityRef.current = Date.now();
        if (showTimeoutDialog) {
            setShowTimeoutDialog(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        let sessionTimeoutMinutes = DEFAULT_TIMEOUT;

        const initSession = async () => {
            sessionTimeoutMinutes = await getSessionTimeout();
            const timeoutMs = sessionTimeoutMinutes * 60 * 1000;

            // Events to track activity
            const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

            const onActivity = () => {
                lastActivityRef.current = Date.now();
            };

            // Add event listeners
            events.forEach(event => {
                window.addEventListener(event, onActivity);
            });

            // Check for inactivity periodically
            checkIntervalRef.current = setInterval(() => {
                const now = Date.now();
                const timeSinceLastActivity = now - lastActivityRef.current;

                // If inactive for longer than timeout
                if (timeSinceLastActivity >= timeoutMs) {
                    handleLogout();
                }
                // Show warning 1 minute before timeout
                else if (timeSinceLastActivity >= timeoutMs - 60000 && !showTimeoutDialog) {
                    // Only show dialog if we haven't already shown it recently
                    // This check is handled by the state, but we double check here
                    setShowTimeoutDialog(true);
                }
            }, 10000); // Check every 10 seconds

            return () => {
                events.forEach(event => {
                    window.removeEventListener(event, onActivity);
                });
                if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
            };
        };

        initSession();

        return () => {
            if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
        };
    }, [isAuthenticated, navigate, logout]);

    return (
        <AlertDialog open={showTimeoutDialog} onOpenChange={setShowTimeoutDialog}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Session Expiring Soon</AlertDialogTitle>
                    <AlertDialogDescription>
                        Your session will expire in less than a minute due to inactivity.
                        Click "Stay Logged In" to continue your session.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={resetTimer}>Stay Logged In</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export default SessionManager;
