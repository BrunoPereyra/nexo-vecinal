import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import Purchases, {
    CustomerInfo,
    PurchasesOffering,
    PurchasesPackage,
} from 'react-native-purchases';

const REVENUECAT_PUBLIC_API_KEY = 'TU_PUBLIC_API_KEY'; // Sacalo de RevenueCat dashboard

export const useRevenueCat = (userId: string | null) => {
    const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const setupRevenueCat = async () => {
            try {
                Purchases.configure({ apiKey: REVENUECAT_PUBLIC_API_KEY, appUserID: userId });

                const offeringsResponse = await Purchases.getOfferings();
                if (offeringsResponse.current) {
                    setOfferings(offeringsResponse.current);
                }

                const info = await Purchases.getCustomerInfo();
                setCustomerInfo(info);
                setIsPro(!!info.entitlements.active.pro);
            } catch (error) {
                console.error('Error al configurar RevenueCat:', error);
                Alert.alert('Error', 'No se pudo cargar la información de suscripción.');
            }
        };

        setupRevenueCat();
    }, [userId]);

    const buySubscription = async (selectedPackage?: PurchasesPackage) => {
        if (!selectedPackage && offerings?.availablePackages.length) {
            selectedPackage = offerings.availablePackages[0]; // El primer paquete disponible
        }

        if (!selectedPackage) {
            Alert.alert('Error', 'No hay paquetes disponibles para comprar.');
            return;
        }

        try {
            const { customerInfo } = await Purchases.purchasePackage(selectedPackage);

            const isActive = !!customerInfo.entitlements.active.pro;
            setIsPro(isActive);
            setCustomerInfo(customerInfo);

            if (isActive) {
                Alert.alert('¡Gracias!', 'Tu suscripción ha sido activada.');
                // Puedes enviar al backend: sendPurchaseToBackend(customerInfo, userId);
            } else {
                Alert.alert('Error', 'La suscripción no está activa.');
            }
        } catch (error: any) {
            if (!error.userCancelled) {
                console.error('Error en la compra:', error);
                Alert.alert('Error', 'No se pudo completar la compra.');
            }
        }
    };

    return {
        offerings,
        customerInfo,
        isPro,
        buySubscription,
    };
};
