// Política de privacidad y Términos y condiciones (español, inglés y portugués).
// Los textos se arman con los datos de contacto configurables y con los campos que pide el formulario de registro,
// para que digan siempre lo que la app realmente hace. Rige la versión en español.
// Borrador preparado por el equipo de desarrollo: la Municipalidad debe revisarlo antes de publicarlo como oficial.

/** Versión vigente. Si cambia, a quienes aceptaron una versión anterior se les pide aceptar de nuevo al entrar. */
export const LEGAL_VERSION = '1.0';
export const LEGAL_DATE = '2026-11-24';

const pick = (lang, es, en, pt) => (lang === 'en' ? en : lang === 'pt' ? pt : es);
const DATE = { es: '24 de noviembre de 2026', en: 'November 24, 2026', pt: '24 de novembro de 2026' };

/** Datos de contacto del Hub en líneas legibles. */
export function contactLines(c, lang = 'es') {
  return [c.owner, c.email && pick(lang, 'Correo: ', 'Email: ', 'E-mail: ') + c.email, c.phone && pick(lang, 'Teléfono: ', 'Phone: ', 'Telefone: ') + c.phone,
    c.address && pick(lang, 'Dirección: ', 'Address: ', 'Endereço: ') + c.address, c.hours && pick(lang, 'Horario de atención: ', 'Opening hours: ', 'Horário de atendimento: ') + c.hours].filter(Boolean);
}

/**
 * Política de privacidad: [{ h: título, p: [párrafos | { ul: [...] }] }].
 * o: { contact, lang, profile: 'celular, comuna…' (campos del perfil en uso), extra: ['Pregunta', …], stats: 'comuna, …' (variables de Datos) }
 */
export function privacy(o) {
  const L = o.lang || 'es', c = o.contact || {}, P = (...a) => pick(L, ...a), x = o.extra || [];
  const q = s => (L === 'en' ? `“${s}”` : `«${s}»`);
  return [
    { h: P('Política de privacidad', 'Privacy policy', 'Política de privacidade'), intro: true, p: [
      P(`Versión ${LEGAL_VERSION}, vigente desde el ${DATE.es}.`, `Version ${LEGAL_VERSION}, in force since ${DATE.en}.`, `Versão ${LEGAL_VERSION}, em vigor desde ${DATE.pt}.`),
      P('Explica qué datos personales usa la app del Hub Providencia, para qué, con quién se comparten, cuánto tiempo se guardan y cómo ejercer tus derechos. Se rige por la Ley N.º 19.628 sobre protección de la vida privada y se ajustará a la Ley N.º 21.719, que entra en vigencia el 15 de octubre de 2027.',
        'It explains which personal data the Hub Providencia app uses, what for, who it is shared with, how long it is kept and how to exercise your rights. It is governed by Chilean Law No. 19,628 on the protection of private life and will be adapted to Law No. 21,719, in force from October 15, 2027.',
        'Explica quais dados pessoais o app do Hub Providencia usa, para quê, com quem são compartilhados, por quanto tempo são guardados e como exercer seus direitos. Rege-se pela Lei chilena n.º 19.628 sobre proteção da vida privada e será ajustada à Lei n.º 21.719, em vigor a partir de 15 de outubro de 2027.'),
      L !== 'es' ? P('', 'In case of differences between translations, the Spanish version prevails.', 'Em caso de diferenças entre traduções, prevalece a versão em espanhol.') : null].filter(Boolean) },
    { h: P('1. Quién es responsable', '1. Who is responsible', '1. Quem é o responsável'), p: [
      P('El responsable del tratamiento de tus datos es:', 'The controller of your data is:', 'O responsável pelo tratamento dos seus dados é:'),
      { ul: contactLines(c, L) },
      P('La app fue desarrollada por KeyPoint Systems, equipo de estudiantes de Ingeniería de la Universidad Mayor, por encargo del Hub. Durante el piloto, KeyPoint Systems opera el servidor y solo trata los datos para hacer funcionar el sistema, siguiendo las instrucciones del Hub.',
        'The app was developed by KeyPoint Systems, a team of engineering students at Universidad Mayor, on behalf of the Hub. During the pilot, KeyPoint Systems runs the server and only processes the data to operate the system, following the Hub’s instructions.',
        'O app foi desenvolvido pela KeyPoint Systems, equipe de estudantes de Engenharia da Universidad Mayor, a pedido do Hub. Durante o piloto, a KeyPoint Systems opera o servidor e só trata os dados para fazer o sistema funcionar, seguindo as instruções do Hub.')] },
    { h: P('2. Qué datos usamos', '2. What data we use', '2. Quais dados usamos'), p: [{ ul: [
      P('Cuenta: tipo y número de documento, nombre, correo, fecha de nacimiento y contraseña (guardada solo como huella irreversible). Foto de perfil, si la subes.',
        'Account: document type and number, name, email, date of birth and password (stored only as an irreversible hash). Profile photo, if you upload one.',
        'Conta: tipo e número de documento, nome, e-mail, data de nascimento e senha (guardada só como impressão irreversível). Foto de perfil, se você enviar.'),
      o.profile ? P(`Perfil: ${o.profile}.`, `Profile: ${o.profile}.`, `Perfil: ${o.profile}.`) : null,
      x.length ? P(`Preguntas agregadas al formulario de registro: ${x.map(q).join(', ')}.`, `Questions added to the sign-up form: ${x.map(q).join(', ')}.`, `Perguntas adicionadas ao formulário de cadastro: ${x.map(q).join(', ')}.`) : null,
      P('Uso del Hub: entradas y salidas con tu código QR, reservas, horas usadas, inscripciones a eventos y certificaciones, penalizaciones, archivos que subes para tus reservas y reportes de fallas.',
        'Use of the Hub: check-ins and check-outs with your QR code, bookings, hours used, event and certification enrolments, penalties, files you upload for your bookings and fault reports.',
        'Uso do Hub: entradas e saídas com seu código QR, reservas, horas usadas, inscrições em eventos e certificações, penalidades, arquivos que você envia para suas reservas e relatos de falhas.'),
      P('Menores de edad: los datos del adulto responsable que autoriza la cuenta.', 'Minors: the details of the responsible adult who authorizes the account.', 'Menores de idade: os dados do adulto responsável que autoriza a conta.'),
      P('Seguridad: dispositivo e inicio de cada sesión, y la dirección IP de los intentos fallidos de ingreso (se descarta a los 15 minutos).',
        'Security: device and start of each session, and the IP address of failed sign-in attempts (discarded after 15 minutes).',
        'Segurança: dispositivo e início de cada sessão, e o endereço IP das tentativas de login malsucedidas (descartado após 15 minutos).')].filter(Boolean) },
      P('No usamos tu ubicación, no hacemos publicidad y no compartimos datos con redes sociales. La cámara solo se usa, si la autorizas, para leer códigos QR, y las imágenes no se guardan.',
        'We do not use your location, we do not run ads and we do not share data with social networks. The camera is used only, if you allow it, to read QR codes, and images are not stored.',
        'Não usamos sua localização, não fazemos publicidade e não compartilhamos dados com redes sociais. A câmera só é usada, se você autorizar, para ler códigos QR, e as imagens não são guardadas.')] },
    { h: P('3. Para qué los usamos', '3. What we use them for', '3. Para que os usamos'), p: [{ ul: [
      P('Crear y administrar tu cuenta, registrar tu entrada al Hub y gestionar tus reservas, horas y certificaciones.', 'To create and manage your account, record your entry to the Hub and manage your bookings, hours and certifications.', 'Criar e administrar sua conta, registrar sua entrada no Hub e gerenciar suas reservas, horas e certificações.'),
      P('Cuidar la seguridad de las personas y de los equipos: aforo, certificaciones para usar máquinas y penalizaciones.', 'To keep people and equipment safe: capacity limits, certifications to use machines and penalties.', 'Cuidar da segurança das pessoas e dos equipamentos: lotação, certificações para usar máquinas e penalidades.'),
      P('Enviarte códigos de acceso y avisos sobre tus reservas, eventos y cuenta.', 'To send you access codes and notices about your bookings, events and account.', 'Enviar códigos de acesso e avisos sobre suas reservas, eventos e conta.'),
      P(`Elaborar estadísticas para mejorar el Hub, solo con ${o.stats || 'datos generales'}, sin tu nombre ni tu RUT.`, `To produce statistics to improve the Hub, using only ${o.stats || 'general data'}, without your name or RUT.`, `Elaborar estatísticas para melhorar o Hub, apenas com ${o.stats || 'dados gerais'}, sem seu nome nem seu RUT.`)] },
      P('Tratamos tus datos con el consentimiento que entregas al registrarte y, en lo que corresponde, para cumplir las funciones del Hub como servicio municipal. No tomamos decisiones automatizadas que te afecten: las penalizaciones siguen reglas visibles en la app y el equipo del Hub puede revisarlas.',
        'We process your data with the consent you give when signing up and, where applicable, to carry out the Hub’s functions as a municipal service. We do not make automated decisions that affect you: penalties follow rules shown in the app and the Hub staff can review them.',
        'Tratamos seus dados com o consentimento que você dá ao se cadastrar e, quando cabível, para cumprir as funções do Hub como serviço municipal. Não tomamos decisões automatizadas que afetem você: as penalidades seguem regras visíveis no app e a equipe do Hub pode revisá-las.')] },
    { h: P('4. Quién accede a tus datos', '4. Who can access your data', '4. Quem acessa seus dados'), p: [{ ul: [
      P('El equipo del Hub, según su función: recepción, encargados de laboratorio (solo de sus laboratorios) y administración. Quien analiza los datos ve estadísticas sin nombre, RUT, correo ni teléfono.',
        'Hub staff, according to their role: reception, lab managers (only for their labs) and administration. Data analysts see statistics without names, RUT, email or phone.',
        'A equipe do Hub, conforme sua função: recepção, responsáveis de laboratório (só dos seus laboratórios) e administração. Quem analisa os dados vê estatísticas sem nome, RUT, e-mail nem telefone.'),
      P('Proveedores técnicos que hacen funcionar el servicio: GitHub Pages publica la app (recibe la dirección IP de quien la visita), Tailscale entrega la conexión cifrada al servidor y el proveedor de correo configurado (hoy Gmail, de Google) envía los mensajes. Si eliges entrar con Google, Google valida tu cuenta. Estas empresas pueden procesar datos fuera de Chile, principalmente en Estados Unidos.',
        'Technical providers that run the service: GitHub Pages hosts the app (it receives the IP address of visitors), Tailscale provides the encrypted connection to the server and the configured email provider (currently Gmail, by Google) sends the messages. If you choose to sign in with Google, Google verifies your account. These companies may process data outside Chile, mainly in the United States.',
        'Provedores técnicos que fazem o serviço funcionar: o GitHub Pages publica o app (recebe o endereço IP de quem o visita), a Tailscale fornece a conexão criptografada com o servidor e o provedor de e-mail configurado (hoje o Gmail, do Google) envia as mensagens. Se você escolher entrar com o Google, o Google valida sua conta. Essas empresas podem tratar dados fora do Chile, principalmente nos Estados Unidos.')] },
      P('No vendemos tus datos ni los cedemos con fines comerciales. Solo los entregaremos a una autoridad cuando la ley lo exija.', 'We do not sell your data or share it for commercial purposes. We will only hand it to an authority when the law requires it.', 'Não vendemos seus dados nem os cedemos para fins comerciais. Só os entregaremos a uma autoridade quando a lei exigir.')] },
    { h: P('5. Cuánto tiempo los guardamos', '5. How long we keep them', '5. Por quanto tempo os guardamos'), p: [{ ul: [
      P('Mientras tengas una cuenta. Si eliminas tu cuenta, queda inactiva para que puedas restablecerla con tu RUT; si pides la eliminación de tus datos, se borran como se explica en la sección 6.',
        'While you have an account. If you delete your account, it becomes inactive so you can restore it with your RUT; if you ask for your data to be deleted, it is erased as explained in section 6.',
        'Enquanto você tiver uma conta. Se você excluir sua conta, ela fica inativa para que possa restaurá-la com seu RUT; se pedir a exclusão dos seus dados, eles são apagados como explicado na seção 6.'),
      P('Los archivos de las reservas se borran solos después de los días que define el Hub. Las sesiones vencen o se cierran cuando sales.', 'Booking files are deleted automatically after the number of days set by the Hub. Sessions expire or end when you sign out.', 'Os arquivos das reservas são apagados automaticamente após os dias definidos pelo Hub. As sessões expiram ou terminam quando você sai.'),
      P('Las estadísticas, que no te identifican, se conservan para el historial del Hub.', 'Statistics, which do not identify you, are kept for the Hub’s records.', 'As estatísticas, que não identificam você, são conservadas para o histórico do Hub.')] }] },
    { h: P('6. Tus derechos', '6. Your rights', '6. Seus direitos'), p: [
      P('Puedes pedir acceso a tus datos y su rectificación, cancelación (eliminación) u oposición a su uso. Desde la vigencia de la Ley N.º 21.719 también podrás pedir su portabilidad y su bloqueo temporal, y reclamar ante la Agencia de Protección de Datos Personales.',
        'You may request access to your data and its rectification, cancellation (deletion) or objection to its use. Once Law No. 21,719 is in force you will also be able to request portability and temporary blocking, and to file a complaint with the Personal Data Protection Agency.',
        'Você pode pedir acesso aos seus dados e sua retificação, cancelamento (exclusão) ou oposição ao seu uso. A partir da vigência da Lei n.º 21.719 também poderá pedir sua portabilidade e seu bloqueio temporário, e reclamar perante a Agência de Proteção de Dados Pessoais.'),
      { ul: [
        P('En la app: Perfil › Editar mis datos (rectificación) y Perfil › Configuración › Privacidad y mis datos (copia, eliminación de datos o de la cuenta).', 'In the app: Profile › Edit my details (rectification) and Profile › Settings › Privacy and my data (copy, deletion of data or of the account).', 'No app: Perfil › Editar meus dados (retificação) e Perfil › Configurações › Privacidade e meus dados (cópia, exclusão dos dados ou da conta).'),
        c.email ? P(`Por correo a ${c.email}, o en la recepción del Hub.`, `By email to ${c.email}, or at the Hub’s reception.`, `Por e-mail para ${c.email}, ou na recepção do Hub.`) : P('En la recepción del Hub.', 'At the Hub’s reception.', 'Na recepção do Hub.')] },
      P('Ejercer estos derechos es gratuito. Responderemos dentro de los plazos que fija la ley y podremos pedirte que acredites tu identidad.', 'Exercising these rights is free. We will reply within the legal deadlines and may ask you to prove your identity.', 'Exercer esses direitos é gratuito. Responderemos dentro dos prazos legais e poderemos pedir que você comprove sua identidade.'),
      P('Puedes retirar tu consentimiento cuando quieras eliminando tu cuenta; eso no afecta lo realizado antes.', 'You can withdraw your consent at any time by deleting your account; this does not affect what was done before.', 'Você pode retirar seu consentimento quando quiser excluindo sua conta; isso não afeta o que foi feito antes.')] },
    { h: P('7. Seguridad', '7. Security', '7. Segurança'), p: [
      P('El documento, el correo, el teléfono y las respuestas al formulario se guardan cifrados (AES-256-GCM). Las contraseñas se guardan como huella irreversible. Toda la comunicación viaja cifrada (HTTPS), cada sesión se puede cerrar desde Perfil y los intentos repetidos de ingreso se bloquean. Si ocurre un incidente que ponga en riesgo tus datos, te avisaremos.',
        'Document number, email, phone and form answers are stored encrypted (AES-256-GCM). Passwords are stored as an irreversible hash. All communication is encrypted (HTTPS), every session can be closed from Profile and repeated sign-in attempts are blocked. If an incident puts your data at risk, we will let you know.',
        'O documento, o e-mail, o telefone e as respostas ao formulário são guardados criptografados (AES-256-GCM). As senhas são guardadas como impressão irreversível. Toda a comunicação é criptografada (HTTPS), cada sessão pode ser encerrada em Perfil e as tentativas repetidas de login são bloqueadas. Se ocorrer um incidente que coloque seus dados em risco, avisaremos você.')] },
    { h: P('8. Niños, niñas y adolescentes', '8. Children and adolescents', '8. Crianças e adolescentes'), p: [
      P('Las personas menores de 18 años necesitan la autorización de un adulto responsable registrado en el Hub, que puede revisar la cuenta del menor. Solo se piden los datos necesarios para usar el Hub de forma segura.',
        'People under 18 need the authorization of a responsible adult registered at the Hub, who can review the minor’s account. Only the data needed to use the Hub safely is requested.',
        'Pessoas menores de 18 anos precisam da autorização de um adulto responsável cadastrado no Hub, que pode revisar a conta do menor. Só são pedidos os dados necessários para usar o Hub com segurança.')] },
    { h: P('9. Cookies y almacenamiento en tu dispositivo', '9. Cookies and storage on your device', '9. Cookies e armazenamento no seu dispositivo'), p: [
      P('La app no usa cookies, herramientas de analítica, publicidad ni rastreo. Guarda en tu navegador solo lo necesario para funcionar:', 'The app does not use cookies, analytics, advertising or tracking tools. It stores only what it needs to work in your browser:', 'O app não usa cookies, ferramentas de análise, publicidade nem rastreamento. Guarda no seu navegador apenas o necessário para funcionar:'),
      { ul: [
        P('Tu sesión, si eliges mantenerla iniciada (si no, se borra al cerrar el navegador).', 'Your session, if you choose to stay signed in (otherwise it is cleared when you close the browser).', 'Sua sessão, se você escolher mantê-la iniciada (caso contrário, é apagada ao fechar o navegador).'),
        P('Tu idioma y las guías de ayuda que ya viste.', 'Your language and the help guides you have already seen.', 'Seu idioma e os guias de ajuda que você já viu.'),
        P('Una copia de la app para que cargue rápido y funcione sin conexión, y en recepción los escaneos pendientes de enviar.', 'A copy of the app so it loads quickly and works offline, and at reception the scans waiting to be sent.', 'Uma cópia do app para carregar rápido e funcionar sem conexão e, na recepção, as leituras pendentes de envio.')] },
      P('Como todo es necesario para el servicio, no se pide aceptar cookies. Si eliges «Continuar con Google», se carga en ese momento el servicio de Google, que usa sus propias cookies según la política de privacidad de Google.',
        'Since all of this is needed for the service, no cookie consent is requested. If you choose “Continue with Google”, Google’s service is loaded at that moment and uses its own cookies under Google’s privacy policy.',
        'Como tudo é necessário para o serviço, não é pedido aceitar cookies. Se você escolher «Continuar com Google», o serviço do Google é carregado nesse momento e usa seus próprios cookies conforme a política de privacidade do Google.')] },
    { h: P('10. Correos', '10. Emails', '10. E-mails'), p: [
      P('Los códigos de acceso y los mensajes sobre tu cuenta se envían siempre, porque son necesarios. Los avisos sobre reservas, eventos y horas puedes dejar de recibirlos con el enlace al final de cada correo o en Perfil › Configuración; seguirás viéndolos en la app.',
        'Access codes and account messages are always sent because they are necessary. You can stop receiving notices about bookings, events and hours with the link at the end of each email or in Profile › Settings; you will still see them in the app.',
        'Os códigos de acesso e as mensagens sobre sua conta são sempre enviados, porque são necessários. Os avisos sobre reservas, eventos e horas você pode deixar de receber pelo link no final de cada e-mail ou em Perfil › Configurações; você continuará vendo-os no app.')] },
    { h: P('11. Cambios a esta política', '11. Changes to this policy', '11. Alterações nesta política'), p: [
      P('Si la cambiamos, publicaremos la nueva versión con su fecha y te la mostraremos al entrar a la app.', 'If we change it, we will publish the new version with its date and show it to you when you open the app.', 'Se a alterarmos, publicaremos a nova versão com sua data e a mostraremos quando você entrar no app.')] },
  ];
}

/** Términos y condiciones de uso. o: { contact, lang } */
export function terms(o) {
  const L = o.lang || 'es', c = o.contact || {}, P = (...a) => pick(L, ...a);
  return [
    { h: P('Términos y condiciones', 'Terms and conditions', 'Termos e condições'), intro: true, p: [
      P(`Versión ${LEGAL_VERSION}, vigente desde el ${DATE.es}.`, `Version ${LEGAL_VERSION}, in force since ${DATE.en}.`, `Versão ${LEGAL_VERSION}, em vigor desde ${DATE.pt}.`),
      P('Regulan el uso de la app y de los espacios del Hub Providencia. Al crear tu cuenta declaras haberlos leído y aceptado.', 'They govern the use of the app and of the Hub Providencia spaces. By creating your account you declare that you have read and accepted them.', 'Regulam o uso do app e dos espaços do Hub Providencia. Ao criar sua conta você declara tê-los lido e aceito.'),
      L !== 'es' ? P('', 'In case of differences between translations, the Spanish version prevails.', 'Em caso de diferenças entre traduções, prevalece a versão em espanhol.') : null].filter(Boolean) },
    { h: P('1. El servicio', '1. The service', '1. O serviço'), p: [
      P(`El servicio lo presta ${c.owner || 'el Hub Providencia'}. Es gratuito y permite registrar tu entrada con código QR, reservar salas, laboratorios y equipos, inscribirte en eventos y certificaciones, y recibir avisos. La app se encuentra en etapa piloto y puede cambiar o interrumpirse para mantenimiento.`,
        `The service is provided by ${c.owner || 'Hub Providencia'}. It is free of charge and lets you record your entry with a QR code, book rooms, labs and equipment, enrol in events and certifications, and receive notices. The app is in a pilot stage and may change or be interrupted for maintenance.`,
        `O serviço é prestado por ${c.owner || 'Hub Providencia'}. É gratuito e permite registrar sua entrada com código QR, reservar salas, laboratórios e equipamentos, inscrever-se em eventos e certificações e receber avisos. O app está em fase piloto e pode mudar ou ser interrompido para manutenção.`)] },
    { h: P('2. Tu cuenta', '2. Your account', '2. Sua conta'), p: [{ ul: [
      P('Entrega datos verdaderos y mantenlos al día. Cada persona puede tener una sola cuenta.', 'Provide truthful data and keep it up to date. Each person may have only one account.', 'Informe dados verdadeiros e mantenha-os atualizados. Cada pessoa pode ter uma única conta.'),
      P('Tu código QR y tu contraseña son personales e intransferibles. Avísanos si alguien más los usa.', 'Your QR code and password are personal and non-transferable. Let us know if someone else uses them.', 'Seu código QR e sua senha são pessoais e intransferíveis. Avise-nos se outra pessoa os usar.'),
      P('Las personas menores de 18 años necesitan la autorización de un adulto responsable, que responde por su uso del Hub.', 'People under 18 need the authorization of a responsible adult, who is answerable for their use of the Hub.', 'Pessoas menores de 18 anos precisam da autorização de um adulto responsável, que responde pelo seu uso do Hub.')] }] },
    { h: P('3. Reservas y uso de los espacios', '3. Bookings and use of the spaces', '3. Reservas e uso dos espaços'), p: [{ ul: [
      P('Las reservas siguen las reglas que muestra la app: horarios, bloques, horas disponibles al mes, tiempo de espera y aviso mínimo para cancelar.', 'Bookings follow the rules shown in the app: opening hours, time blocks, monthly hours, waiting time and minimum notice to cancel.', 'As reservas seguem as regras mostradas no app: horários, blocos, horas mensais disponíveis, tempo de espera e aviso mínimo para cancelar.'),
      P('Registra tu entrada y tu salida en recepción. No llegar a una reserva o irse sin marcar la salida puede descontar horas o generar una penalización.', 'Check in and out at reception. Missing a booking or leaving without checking out may deduct hours or result in a penalty.', 'Registre sua entrada e saída na recepção. Não comparecer a uma reserva ou sair sem registrar a saída pode descontar horas ou gerar uma penalidade.'),
      P('Usar un laboratorio o una máquina requiere la certificación correspondiente. Usa los equipos con cuidado, sigue las indicaciones del encargado y reporta las fallas en la app.', 'Using a lab or a machine requires the corresponding certification. Use the equipment carefully, follow the manager’s instructions and report faults in the app.', 'Usar um laboratório ou uma máquina exige a certificação correspondente. Use os equipamentos com cuidado, siga as orientações do responsável e relate falhas no app.'),
      P('Los archivos que subas para una reserva deben ser tuyos o contar con permiso para usarlos. El encargado puede revisarlos y rechazarlos si no son adecuados.', 'Files you upload for a booking must be yours or used with permission. The manager may review them and reject them if they are not appropriate.', 'Os arquivos que você enviar para uma reserva devem ser seus ou ter permissão de uso. O responsável pode revisá-los e recusá-los se não forem adequados.')] }] },
    { h: P('4. Convivencia', '4. Conduct', '4. Convivência'), p: [
      P('Trata con respeto a las personas y los espacios. No está permitido suplantar a otra persona, intentar vulnerar el sistema ni usar el Hub para actividades ilegales. El daño causado por mal uso de los equipos se rige por el reglamento del Hub.',
        'Treat people and spaces with respect. Impersonating someone, trying to break into the system or using the Hub for illegal activities is not allowed. Damage caused by misuse of the equipment is governed by the Hub’s rules.',
        'Trate as pessoas e os espaços com respeito. Não é permitido se passar por outra pessoa, tentar violar o sistema nem usar o Hub para atividades ilegais. O dano causado por mau uso dos equipamentos é regido pelo regulamento do Hub.')] },
    { h: P('5. Restricciones', '5. Restrictions', '5. Restrições'), p: [
      P('Si no se cumplen estos términos o las reglas del Hub, el equipo puede descontar horas o restringir el acceso por un tiempo. La app te muestra el motivo y la duración, y puedes pedir que se revise en recepción.',
        'If these terms or the Hub’s rules are not followed, the staff may deduct hours or restrict access for a period. The app shows you the reason and duration, and you can ask for a review at reception.',
        'Se estes termos ou as regras do Hub não forem cumpridos, a equipe pode descontar horas ou restringir o acesso por um tempo. O app mostra o motivo e a duração, e você pode pedir uma revisão na recepção.')] },
    { h: P('6. Privacidad', '6. Privacy', '6. Privacidade'), p: [
      P('El uso de tus datos se explica en la Política de privacidad, que forma parte de estos términos.', 'The use of your data is explained in the Privacy policy, which is part of these terms.', 'O uso dos seus dados é explicado na Política de privacidade, que faz parte destes termos.')] },
    { h: P('7. Cambios y término', '7. Changes and termination', '7. Alterações e término'), p: [
      P('Si cambiamos estos términos, te mostraremos la nueva versión al entrar a la app para que la aceptes. Puedes dejar de usar el servicio cuando quieras eliminando tu cuenta.', 'If we change these terms, we will show you the new version when you open the app so you can accept it. You can stop using the service at any time by deleting your account.', 'Se alterarmos estes termos, mostraremos a nova versão quando você entrar no app para que a aceite. Você pode deixar de usar o serviço quando quiser excluindo sua conta.')] },
    { h: P('8. Contacto y ley aplicable', '8. Contact and governing law', '8. Contato e lei aplicável'), p: [{ ul: contactLines(c, L) },
      P('Estos términos se rigen por las leyes de la República de Chile.', 'These terms are governed by the laws of the Republic of Chile.', 'Estes termos são regidos pelas leis da República do Chile.')] },
  ];
}

/** Documento como Markdown (para docs/ y la carpeta legal). */
export const toMarkdown = secs => secs.map((s, i) => `${i ? '## ' : '# '}${s.h}\n\n${s.p.map(p => (typeof p === 'string' ? p : p.ul.map(x => '- ' + x).join('\n'))).join('\n\n')}`).join('\n\n') + '\n';

/** Pie de los correos. kind 'aviso' (se puede dar de baja) o 'cuenta' (necesario). links: { unsubscribe, app } */
export function mailFooter({ kind = 'cuenta', contact = {}, version = '', links = {} }) {
  const lines = ['', '—', kind === 'aviso'
    ? 'Recibes este aviso porque tienes una cuenta en el Hub Providencia.' + (links.unsubscribe ? `\nPara dejar de recibir avisos por correo: ${links.unsubscribe}` : '') + '\nTambién puedes desactivarlos en la app: Perfil › Configuración › Avisos por correo.'
    : 'Este mensaje es necesario para tu cuenta del Hub Providencia y no se puede desactivar.',
  contactLines(contact).join(' · '),
  `Keypoint Hub Providencia${version ? ' ' + version : ''} · Diseñada por KeyPoint Systems con herramientas de IA.`];
  return lines.filter(x => x !== undefined && x !== null).join('\n');
}

/** Firma del enlace de baja (HMAC-SHA256 con una clave del servidor; en la demo, una fija). */
export async function unsubToken(secret, uid) {
  const enc = new TextEncoder(), k = await crypto.subtle.importKey('raw', enc.encode(String(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode('baja:' + uid)));
  let s = ''; for (const b of sig.slice(0, 18)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
