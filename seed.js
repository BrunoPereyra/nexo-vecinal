(() => {

    const names = [
        "Alejandro Pérez", "María Gómez", "Lucía Fernández", "Diego Ramírez",
        "Sofía Torres", "Matías Herrera", "Valentina Díaz", "Julián Moreno",
        "Camila Rodríguez", "Lucas Sánchez", "Isabella Castro", "Martín Ruiz",
        "Emma Flores", "Santiago López", "Victoria Jiménez", "Bruno Silva",
        "Renata Cruz", "Tomás Ortega", "Paula Medina", "Nicolás Vega"
    ];
    const jobTitles = [
        "Reparación de cañerías urgentes", "Instalación de luminarias exteriores",
        "Pintura interior de departamento", "Mantenimiento de jardín y poda",
        "Revisión y arreglo de circuito eléctrico", "Montaje de muebles de oficina",
        "Limpieza profunda tras reforma", "Reparación de electrodomésticos",
        "Servicio de fontanería general", "Cambio de cerraduras y llaves",
        "Instalación de sistema de riego", "Colocación de cerámica en baño",
        "Aislamiento térmico de ventana", "Arreglo de tejado y goteras",
        "Montaje de estanterías de cocina", "Pulido y encerado de pisos",
        "Reparación de puerta corrediza", "Instalación de aire acondicionado",
        "Impermeabilización de terraza", "Revisión de sistema de calefacción"
    ];
    const jobDescriptions = [
        "Se requiere reparar fugas en tuberías principales de la cocina.",
        "Instalar luminarias LED en jardín y perímetro exterior.",
        "Pintura completa de sala y pasillo con esmalte satinado.",
        "Poda de setos, siega de césped y limpieza de hojas.",
        "Revisar y corregir fallos en el panel eléctrico.",
        "Montar 5 escritorios y 10 sillas de oficina IKEA.",
        "Limpieza a fondo tras remodelación de cocina.",
        "Diagnóstico y arreglo de lavadora y secadora.",
        "Servicio completo de fontanería en baño y cocina.",
        "Cambio de cerradura de seguridad y duplicado de llaves.",
        "Instalación de aspersores automáticos en jardín.",
        "Colocación de azulejos cerámicos en ducha.",
        "Sellado y aislamiento de marcos de ventanas.",
        "Reparación de tejas sueltas y filtraciones.",
        "Montaje de muebles de cocina a medida.",
        "Pulido de mármol y aplicación de cera protectora.",
        "Arreglo de rieles y rodillos de puerta corrediza.",
        "Instalación de unidad split de aire acondicionado.",
        "Aplicación de membrana impermeable en terraza.",
        "Revisión y limpieza de caldera de calefacción."
    ];

    const now = new Date();
    const plus30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const baseUser = {
        Avatar: "https://deploy.pinkker.tv/nexo-vecinal-media/imgs/default/avatar_default/Fotoperfil1.png",
        Pais: "", Ciudad: "", Biography: "", Look: "", LookImage: "", Banner: "", headImage: "",
        CountryInfo: null, Partner: {},
        EditProfiile: { NameUser: now, Biography: now },
        socialnetwork: { facebook: "", twitter: "", instagram: "", youtube: "", tiktok: "", Website: "" },
        Verified: false, Phone: "", Gender: "male", Situation: "",
        Following: {}, Followers: {},
        Timestamp: now, Banned: false, TOTPSecret: "", LastConnection: new Date(0),
        PanelAdminNexoVecinal: { Level: 1, Code: "", Date: now },
        completedJobs: 0, Soporte: "", pushToken: "", tags: ["Test"],
        location: { type: "Point", coordinates: [-64.193 + Math.random() * 0.02, -31.411 + Math.random() * 0.02] },
        ratio: NumberLong(5000)
    };

    for (let i = 0; i < 20; i++) {
        const userId = new ObjectId();
        const fullName = names[i];
        const nameUser = fullName.replace(/\s+/g, "").toLowerCase();
        const email = `${nameUser}@example.com`;

        db.Users.insertOne({
            _id: userId,
            ...baseUser,
            FullName: fullName,
            NameUser: nameUser,
            Email: email,
            BirthDate: new Date(2000 + Math.floor(Math.random() * 23), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
            Premium: { MonthsSubscribed: 1, SubscriptionStart: now, SubscriptionEnd: plus30 },
            PanelAdminNexoVecinal: { Level: 1, Code: nameUser, Date: now },
            soporteassigned: userId
        });

        db.Job.insertOne({
            _id: new ObjectId(),
            userId: userId,
            title: jobTitles[i],
            description: jobDescriptions[i],
            location: { type: "Point", coordinates: [-64.187 + Math.random() * 0.02, -31.425 + Math.random() * 0.02] },
            tags: ["Plomero", "Ahora"],
            budget: Math.floor(1000 + Math.random() * 4000),
            finalCost: 0, status: "open", applicants: [],
            assignedApplication: { applicantId: ObjectId("000000000000000000000000"), proposal: "", price: 0, appliedAt: new Date(0) },
            createdAt: now, updatedAt: now,
            Images: [""], paymentStatus: "", paymentAmount: 0, paymentIntentId: "",
            available: true // ← agregado disponible
        });
    }

    print("✅ 20 usuarios con nombres reales y sus jobs fueron insertados.");
})();

