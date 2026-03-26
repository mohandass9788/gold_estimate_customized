import { useAuth } from '../store/AuthContext';
import { checkAuthStatus } from '../services/authService';
import { useGeneralSettings } from '../store/GeneralSettingsContext';
import { useRouter } from 'expo-router';

export function useSubscriptionRestricted() {
    const { currentUser, refreshProfile, logout } = useAuth();
    const { updateFeatureFlags, t, showAlert } = useGeneralSettings();
    const router = useRouter();

    const isRestricted = !currentUser || !currentUser.isSubscriptionValid;

    const verifyAccess = async (actionCallback: () => void | Promise<void>) => {
        if (!isRestricted) {
            await actionCallback();
            return;
        }

        try {
            const res = await checkAuthStatus();
            
            if (res?.features) {
                updateFeatureFlags({
                    isChitEnabled: !!res.features.chit,
                    isPurchaseEnabled: !!res.features.purchase,
                    isEstimationEnabled: !!res.features.estimation,
                    isAdvanceEnabled: !!res.features.advance_chit,
                    isRepairEnabled: !!res.features.repair,
                });
            }

            if (res?.data?.user?.isSubscriptionValid || res?.isSubscriptionValid || res?.user?.isSubscriptionValid) {
                await refreshProfile();
                showAlert(
                    t('activation_success') || 'Activation Successful', 
                    (t('valid_until') || 'Your subscription is valid until: ') + new Date(res.user.subscription_valid_upto || '').toLocaleDateString(),
                    'success',
                    [{ text: 'OK', onPress: () => { actionCallback(); } }]
                );
                return;
            }

        } catch (e: any) {
             const isExpired = e.message?.includes('expired');
             const isDeactivated = e.message?.includes('deactivated');
             if (isDeactivated || isExpired) {
                 const title = isExpired ? t('session_expired_title') : 'Access Denied';
                 showAlert(title, e.message, 'error', [{ text: 'OK', onPress: logout }]);
                 return;
             }
        }

        showAlert(
            t('subscription_expired_title') || 'Subscription Expired',
            t('subscription_expired_msg') || 'Your 1-Day Trial or Subscription has expired. You can view existing data, but this action is restricted. Please complete your payment to continue.',
            'warning',
            [
                { text: t('cancel') || 'Cancel', style: 'cancel' },
                { 
                    text: t('go_to_help') || 'Go to Help', 
                    onPress: () => router.push('/activation') 
                }
            ]
        );
    };

    return { verifyAccess, isRestricted };
}
