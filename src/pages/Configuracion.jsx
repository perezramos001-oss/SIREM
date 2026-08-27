import React, { useState, useEffect } from "react";
import "./Configuracion.css";

import {
    UserRound,
    UsersRound,
    ShieldCheck,
    ChevronRight,
    ArrowLeft,
    LockKeyhole,
    Mail,
    User,
    BadgeCheck,
    LogOut
} from "lucide-react";

function Configuracion({
    usuarioActual,
    cerrarSesion
}) {

    const [seccion, setSeccion] = useState("principal");

    const [modalUsuarioAbierto, setModalUsuarioAbierto] =
    useState(false);

    const [modalEditarUsuarioAbierto, setModalEditarUsuarioAbierto] =
    useState(false);

    const [mostrarConfirmacionCierre, setMostrarConfirmacionCierre] = useState(false);
    const [usuarioEditando, setUsuarioEditando] =
    useState(null);

    const abrirEditarUsuario = (usuario) => {

    setUsuarioEditando({
        ...usuario
    });

    setModalEditarUsuarioAbierto(true);

};

const guardarCambiosUsuario = async () => {

    try {

        if (
            !usuarioEditando.nombre ||
            !usuarioEditando.usuario ||
            !usuarioEditando.rol
        ) {

            alert(
                "Por favor completa todos los campos."
            );

            return;

        }


        const datosUsuario = {

            nombre: usuarioEditando.nombre.trim(),

            usuario: usuarioEditando.usuario.trim(),

            rol: usuarioEditando.rol,

            activo:
                usuarioEditando.estado === "Activo"
                    ? 1
                    : 0

        };


        console.log(
            "DATOS QUE SE VAN A ENVIAR:",
            datosUsuario
        );


        const respuesta = await fetch(

            `/api/usuarios/${usuarioEditando.id_usuario}`,

            {

                method: "PUT",

                headers: {

                    "Content-Type":
                        "application/json"

                },

                body: JSON.stringify(
                    datosUsuario
                )

            }

        );


        const datos =
            await respuesta.json();


        if (!respuesta.ok) {

            alert(

                datos.mensaje ||
                "No se pudo actualizar el usuario."

            );

            return;

        }


        setUsuarios((usuariosActuales) =>

            usuariosActuales.map((usuario) =>

                usuario.id_usuario ===
                usuarioEditando.id_usuario

                    ? {

                        ...usuario,

                        ...datos.usuario,

                        estado:
                            Number(
                                datos.usuario.activo
                            ) === 1
                                ? "Activo"
                                : "Inactivo"

                    }

                    : usuario

            )

        );


        alert(
            "Usuario actualizado correctamente."
        );


        setModalEditarUsuarioAbierto(false);

        setUsuarioEditando(null);


    } catch (error) {

        console.error(
            "Error actualizando usuario:",
            error
        );


        alert(
            "Error de conexión con el servidor."
        );

    }

};

const [nuevoUsuario, setNuevoUsuario] = useState({
    nombre: "",
    usuario: "",
    rol: "ADMINISTRADOR",
    password: "",
    estado: "Activo"
});
  const [usuarios, setUsuarios] = useState([]);
   
useEffect(() => {

    const cargarUsuarios = async () => {

        try {

            const respuesta = await fetch(
                "/api/usuarios"
            );

            if (!respuesta.ok) {
                throw new Error(
                    "No se pudieron cargar los usuarios."
                );
            }

            const datos = await respuesta.json();

            setUsuarios(
                datos.map((usuario) => ({
                    ...usuario,

                    id: usuario.id_usuario,

                    estado:
                        usuario.activo === 1
                            ? "Activo"
                            : "Inactivo"
                }))
            );

        } catch (error) {

            console.error(
                "Error cargando usuarios:",
                error
            );

        }

    };

    cargarUsuarios();

}, []);

const guardarUsuario = async () => {

    try {

        if (
            !nuevoUsuario.nombre ||
            !nuevoUsuario.usuario ||
            !nuevoUsuario.password ||
            !nuevoUsuario.rol
        ) {

            alert("Por favor completa todos los campos.");
            return;

        }


        const usuarioExiste = usuarios.some(
            (usuario) =>
                usuario.usuario &&
                usuario.usuario.toLowerCase() ===
                nuevoUsuario.usuario.toLowerCase()
        );


        if (usuarioExiste) {

            alert("Ya existe un usuario con ese nombre de usuario.");
            return;

        }


        const respuesta = await fetch(
            "/api/usuarios",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    nombre: nuevoUsuario.nombre,

                    usuario: nuevoUsuario.usuario,

                    password: nuevoUsuario.password,

                    rol: nuevoUsuario.rol,

                    activo:
                        nuevoUsuario.estado === "Activo"
                            ? 1
                            : 0

                })

            }
        );


        const datos = await respuesta.json();


        if (!respuesta.ok) {

            alert(
                datos.mensaje ||
                "No se pudo crear el usuario."
            );

            return;

        }


        alert("Usuario creado correctamente.");


        setUsuarios([
            ...usuarios,
            {
                ...datos.usuario,

                estado:
                    Number(datos.usuario.activo) === 1
                        ? "Activo"
                        : "Inactivo"
            }
        ]);


        setNuevoUsuario({

            nombre: "",

            usuario: "",

            rol: "FACTURACIÓN",

            estado: "Activo",

            password: ""

        });


        setModalUsuarioAbierto(false);


    } catch (error) {

        console.error(
            "Error guardando usuario:",
            error
        );

        alert(
            "Error de conexión con el servidor."
        );

    }

};

const [modalPasswordAbierto, setModalPasswordAbierto] =
    useState(false);

const [passwordActual, setPasswordActual] =
    useState("");

const [passwordNueva, setPasswordNueva] =
    useState("");

const [confirmarPassword, setConfirmarPassword] =
    useState("");

    const cambiarPassword = async () => {

    try {

        if (
            !passwordActual ||
            !passwordNueva ||
            !confirmarPassword
        ) {

            alert(
                "Por favor completa todos los campos."
            );

            return;

        }


        if (
            passwordNueva !== confirmarPassword
        ) {

            alert(
                "Las nuevas contraseñas no coinciden."
            );

            return;

        }


        if (
            passwordNueva.length < 6
        ) {

            alert(
                "La nueva contraseña debe tener mínimo 6 caracteres."
            );

            return;

        }


        const respuesta = await fetch(

            `/api/usuarios/${usuarioActual.id_usuario}/password`,

            {

                method: "PUT",

                headers: {

                    "Content-Type": "application/json"

                },

                body: JSON.stringify({

                    passwordActual,

                    passwordNueva

                })

            }

        );


        const datos = await respuesta.json();


        if (!respuesta.ok) {

            alert(

                datos.mensaje ||
                "No se pudo cambiar la contraseña."

            );

            return;

        }


        alert(
            "Contraseña actualizada correctamente."
        );


        setPasswordActual("");

        setPasswordNueva("");

        setConfirmarPassword("");


        setModalPasswordAbierto(false);


    } catch (error) {

        console.error(
            "Error cambiando contraseña:",
            error
        );


        alert(
            "Error de conexión con el servidor."
        );

    }

};

    /* =========================
       PÁGINA PRINCIPAL
    ========================= */

    console.log("USUARIO ACTUAL:", usuarioActual);

    if (seccion === "principal") {

        return (

            <div className="configuracion-page">

                <div className="configuracion-page-header">

                    <div>

                        <span className="configuracion-tag">
                            SISTEMA
                        </span>

                        <h1>
                            Configuración
                        </h1>

                        <p>
                            Administra tu cuenta y los accesos del sistema.
                        </p>

                    </div>

                </div>


                <div className="configuracion-grid">


                    {/* MI CUENTA */}

                  <button
    className="configuracion-card"
    onClick={() => setSeccion("cuenta")}
>

    <div className="configuracion-card-icon">
        <UserRound size={24} />
    </div>

    <div className="configuracion-card-content">

        <h3>
            Mi cuenta y seguridad
        </h3>

        <p>
            Perfil, contraseña y seguridad de la cuenta
        </p>

    </div>

    <ChevronRight size={20} />

</button>

                    {/* USUARIOS */}

{usuarioActual.rol === "ADMINISTRADOR" && (

    <button
        className="configuracion-card"
        onClick={() => setSeccion("usuarios")}
    >

        <div className="configuracion-card-icon">

            <UsersRound size={23} />

        </div>

        <div className="configuracion-card-content">

            <h3>
                Usuarios y permisos
            </h3>

            <p>
                Administra usuarios, roles y accesos
                al sistema.
            </p>

        </div>

        <ChevronRight
            size={20}
            className="configuracion-card-arrow"
        />

    </button>

)}
                     
     </div>


                <div className="configuracion-security">

                    <div className="configuracion-security-icon">

                        <ShieldCheck size={22} />

                    </div>

                    <div>

                        <strong>
                            Sistema protegido
                        </strong>

                        <p>
                            Los permisos y accesos del sistema están
                            controlados según el rol de cada usuario.
                        </p>

                    </div>

                </div>

            </div>

        );

    }


    /* =========================
       MI CUENTA Y SEGURIDAD
    ========================= */

    if (seccion === "cuenta") {

        return (

            <div className="configuracion-page">


                {/* ENCABEZADO */}

                <div className="configuracion-detail-header">

                    <button
                        className="configuracion-back"
                        onClick={() => setSeccion("principal")}
                    >

                        <ArrowLeft size={17} />

                        Volver a configuración

                    </button>


                    <span className="configuracion-tag">
                        CUENTA
                    </span>

                    <h1>
                        Mi cuenta y seguridad
                    </h1>

                    <p>
                        Consulta tu información y administra la seguridad
                        de tu cuenta.
                    </p>

                </div>


                {/* INFORMACIÓN DEL USUARIO */}

                <div className="cuenta-section">

                    <div className="cuenta-section-header">

                        <div>

                            <h2>
                                Información de la cuenta
                            </h2>

                            <p>
                                Datos asociados al usuario actualmente conectado.
                            </p>

                        </div>

                        <div className="cuenta-avatar">
    {usuarioActual.nombre
        ?.split(" ")
        .map((nombre) => nombre[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()}
</div>

                    </div>


                    <div className="cuenta-info-grid">


                        <div className="cuenta-info-item">

                            <div className="cuenta-info-icon">

                                <User size={17} />

                            </div>

                            <div>

                                <span>
                                    Nombre
                                </span>

                               <strong>
    {usuarioActual.nombre}
</strong>
                            </div>

                        </div>


                        <div className="cuenta-info-item">

                            <div className="cuenta-info-icon">

                                <UserRound size={17} />

                            </div>

                            <div>

                                <span>
                                    Usuario
                                </span>

                               <strong>
    {usuarioActual.nombre?.split(" ")[0]}
</strong>

                            </div>

                        </div>


                        <div className="cuenta-info-item">

                            <div className="cuenta-info-icon">

                                <Mail size={17} />

                            </div>

                            <div>

                                <span>
                                    Usuario
                                </span>

   <strong>
    {usuarioActual.usuario || "No registrado"}
</strong>


                            </div>

                        </div>


                        <div className="cuenta-info-item">

                            <div className="cuenta-info-icon">

                                <BadgeCheck size={17} />

                            </div>

                            <div>

                                <span>
                                    Rol
                                </span>

                               <strong>
    {usuarioActual.rol}
</strong>

                            </div>

                        </div>

                    </div>

                </div>


                {/* SEGURIDAD */}

                <div className="cuenta-section">

                    <div className="cuenta-section-header">

                        <div>

                            <h2>
                                Seguridad
                            </h2>

                            <p>
                                Administra el acceso y la protección de tu cuenta.
                            </p>

                        </div>

                        <LockKeyhole
                            size={22}
                            className="seguridad-header-icon"
                        />

                    </div>


   <button
    className="seguridad-option"
    onClick={() => {
        console.log("CLICK EN CAMBIAR CONTRASEÑA");
        setModalPasswordAbierto(true);
    }}
>

    <div className="seguridad-option-icon">

        <LockKeyhole size={19} />

    </div>

    <div className="seguridad-option-content">

        <strong>
            Cambiar contraseña
        </strong>

        <span>
            Actualiza tu contraseña para mantener segura
            tu cuenta.
        </span>

    </div>

    <ChevronRight
        size={18}
        className="seguridad-arrow"
    />

</button>


                    <div className="seguridad-option">

                        <div className="seguridad-option-icon">

                            <ShieldCheck size={19} />

                        </div>

                        <div className="seguridad-option-content">

                            <strong>
                                Estado de seguridad
                            </strong>

                            <span>
                                Tu cuenta se encuentra activa y protegida.
                            </span>

                        </div>

                        <span className="estado-activo">
                            Activa
                        </span>

                    </div>

                </div>


             {/* CERRAR SESIÓN */}

<button
    className="cerrar-sesion"
    onClick={() => {
        setMostrarConfirmacionCierre(true);
    }}
>
    <LogOut size={18} />

    Cerrar sesión
</button>


{/* MODAL CAMBIAR CONTRASEÑA */}

{modalPasswordAbierto && (

    <div className="modal-password-overlay">

        <div className="modal-password">

            <button
                className="cerrar-modal-password"
                onClick={() => {
                    setModalPasswordAbierto(false);
                }}
            >
                ×
            </button>


            <div className="modal-password-header">

                <span>
                    SEGURIDAD
                </span>

                <h2>
                    Cambiar contraseña
                </h2>

                <p>
                    Actualiza tu contraseña para mantener
                    segura tu cuenta.
                </p>

            </div>


            <div className="modal-password-body">

                <div className="password-form-group">

                    <label>
                        Contraseña actual
                    </label>

                    <input
                        type="password"
                        placeholder="Ingresa tu contraseña actual"
                        value={passwordActual}
                        onChange={(e) =>
                            setPasswordActual(e.target.value)
                        }
                    />

                </div>


                <div className="password-form-group">

                    <label>
                        Nueva contraseña
                    </label>

                    <input
                        type="password"
                        placeholder="Ingresa tu nueva contraseña"
                        value={passwordNueva}
                        onChange={(e) =>
                            setPasswordNueva(e.target.value)
                        }
                    />

                </div>


                <div className="password-form-group">

                    <label>
                        Confirmar nueva contraseña
                    </label>

                    <input
                        type="password"
                        placeholder="Confirma tu nueva contraseña"
                        value={confirmarPassword}
                        onChange={(e) =>
                            setConfirmarPassword(e.target.value)
                        }
                    />

                </div>

            </div>


            <div className="modal-password-footer">

                <button
                    className="cancelar-password-btn"
                    onClick={() => {
                        setModalPasswordAbierto(false);
                    }}
                >
                    Cancelar
                </button>


                <button
                    className="actualizar-password-btn"
                >
                    Actualizar contraseña
                </button>

            </div>

        </div>

    </div>

)}

{mostrarConfirmacionCierre && (

    <div className="modal-password-overlay">

        <div className="modal-password">

            <button
                className="cerrar-modal-password"
                onClick={() => setMostrarConfirmacionCierre(false)}
            >
                ×
            </button>

            <div className="modal-password-header">

                <span>SESIÓN</span>

                <h2>¿Cerrar sesión?</h2>

                <p>
                    ¿Estás segura de que deseas cerrar tu sesión?
                </p>

            </div>

            <div className="modal-password-footer">

                <button
                    className="cancelar-password-btn"
                    onClick={() => setMostrarConfirmacionCierre(false)}
                >
                    Cancelar
                </button>

                <button
                    className="actualizar-password-btn"
                    onClick={cerrarSesion}
                >
                    <LogOut size={16} />

                    Cerrar sesión
                </button>

            </div>

        </div>

    </div>

)}

</div>

);

    
    }

    
 /* =========================
   USUARIOS Y PERMISOS
========================= */

if (seccion === "usuarios") {

    return (

        <div className="configuracion-page">


            {/* ENCABEZADO */}

            <div className="configuracion-detail-header">

                <button
                    className="configuracion-back"
                    onClick={() => setSeccion("principal")}
                >
                    <ArrowLeft size={17} />

                    Volver a configuración
                </button>

            </div>


            <div className="usuarios-header">

                <div>

                    <h1>
                        Usuarios y permisos
                    </h1>

                    <p>
                        Administra los usuarios y sus permisos dentro del sistema.
                    </p>

                </div>

<button
    className="nuevo-usuario-btn"
    onClick={() => setModalUsuarioAbierto(true)}
>
    + Nuevo usuario
</button>

            </div>


            {/* TABLA */}

            <div className="usuarios-card">

                <table className="usuarios-table">

                    <thead>

                        <tr>

                            <th>
                                Usuario
                            </th>

                            <th>
                                Rol
                            </th>

                            <th>
                                Estado
                            </th>

                            <th>
                                Acciones
                            </th>

                        </tr>

                    </thead>


                    <tbody>

{usuarios.map((usuario) => (

    <tr key={usuario.id}>

        <td>

            <div className="usuario-info">

                <div className="usuario-avatar">

                    {usuario.nombre.charAt(0)}

                </div>

                <div>

                    <strong>
                        {usuario.nombre}
                    </strong>

                </div>

            </div>

        </td>


        <td>

            <span
                className={`rol-badge ${
                    usuario.rol === "ADMINISTRADOR"
                        ? "admin"
                        : usuario.rol === "FACTURACIÓN"
                        ? "facturacion"
                        : "comercial"
                }`}
            >

                {usuario.rol}

            </span>

        </td>


        <td>

            <span
                className={`estado-badge ${
                    usuario.estado === "Activo"
                        ? "activo"
                        : "inactivo"
                }`}
            >

                {usuario.estado}

            </span>

        </td>


        <td>

           <button
    className="accion-usuario"
    onClick={() => abrirEditarUsuario(usuario)}
>

    Editar

</button>

        </td>

    </tr>

))}
                       

                    </tbody>

                </table>

            </div>

{/* =========================
    MODAL EDITAR USUARIO
========================= */}

{modalEditarUsuarioAbierto && usuarioEditando && (

    <div className="modal-usuario-overlay">

        <div className="modal-usuario">

            {/* HEADER */}

            <div className="modal-usuario-header">

                <div>

                    <span>
                        USUARIOS
                    </span>

                    <h2>
                        Editar usuario
                    </h2>

                    <p>
                        Actualiza la información, el rol o el estado del usuario.
                    </p>

                </div>


                <button
                    className="cerrar-modal-usuario"
                    onClick={() => {

                        setModalEditarUsuarioAbierto(false);

                        setUsuarioEditando(null);

                    }}
                >
                    ×
                </button>

            </div>


            {/* BODY */}

            <div className="modal-usuario-body">


                <div className="usuario-form-group">

                    <label>
                        Nombre
                    </label>

                    <input
                        type="text"
                        value={usuarioEditando.nombre || ""}
                        onChange={(e) =>
                            setUsuarioEditando({
                                ...usuarioEditando,
                                nombre: e.target.value
                            })
                        }
                    />

                </div>


               <div className="usuario-form-group">

    <label>
        Usuario
    </label>

    <input
        type="text"
        value={usuarioEditando.usuario || ""}
        onChange={(e) =>
            setUsuarioEditando({
                ...usuarioEditando,
                usuario: e.target.value
            })
        }
    />

</div>


                <div className="usuario-form-group">

                    <label>
                        Rol
                    </label>

                    <select
                        value={usuarioEditando.rol || "FACTURACIÓN"}
                        onChange={(e) =>
                            setUsuarioEditando({
                                ...usuarioEditando,
                                rol: e.target.value
                            })
                        }
                    >

                        <option value="ADMINISTRADOR">
                            ADMINISTRADOR
                        </option>

                        <option value="FACTURACIÓN">
                            FACTURACIÓN
                        </option>

                        <option value="COMERCIAL">
                            COMERCIAL
                        </option>

                    </select>

                </div>


                <div className="usuario-form-group">

                    <label>
                        Estado
                    </label>

                    <select
                        value={usuarioEditando.estado || "Activo"}
                        onChange={(e) =>
                            setUsuarioEditando({
                                ...usuarioEditando,
                                estado: e.target.value
                            })
                        }
                    >

                        <option value="Activo">
                            Activo
                        </option>

                        <option value="Inactivo">
                            Inactivo
                        </option>

                    </select>

                </div>


            </div>


            {/* FOOTER */}

            <div className="modal-usuario-footer">

                <button
                    className="cancelar-usuario-btn"
                    onClick={() => {

                        setModalEditarUsuarioAbierto(false);

                        setUsuarioEditando(null);

                    }}
                >
                    Cancelar
                </button>


            <button
    className="guardar-usuario-btn"
    onClick={guardarCambiosUsuario}
>
    Guardar cambios
</button>

            </div>

        </div>

    </div>

)}

            {/* INFORMACIÓN DE PERMISOS */}

            <div className="permisos-info">

                <h3>
                    Permisos por rol
                </h3>


                <div className="permisos-grid">


                    <div className="permiso-card">

                        <strong>
                            ADMINISTRADOR
                        </strong>

                        <p>
                            Acceso completo al sistema, gestión de usuarios,
                            configuración y registro en WO.
                        </p>

                    </div>


                    <div className="permiso-card">

                        <strong>
                            FACTURACIÓN
                        </strong>

                        <p>
                            Puede visualizar el sistema y registrar
                            remisiones.
                        </p>

                    </div>


                    <div className="permiso-card">

                        <strong>
                            COMERCIAL
                        </strong>

                        <p>
                            Puede visualizar el sistema y registrar
                            remisiones.
                        </p>

                    </div>

                </div>

            </div>


            {/* MODAL NUEVO USUARIO */}

            {modalUsuarioAbierto && (

                <div className="modal-usuario-overlay">

                    <div className="modal-usuario">

                        <div className="modal-usuario-header">

                            <div>

                                <span>
                                    USUARIOS
                                </span>

                                <h2>
                                    Nuevo usuario
                                </h2>

                                <p>
                                    Crea un nuevo usuario y asigna su rol dentro del sistema.
                                </p>

                            </div>

                            <button
                                className="cerrar-modal-usuario"
                                onClick={() =>
                                    setModalUsuarioAbierto(false)
                                }
                            >
                                ×
                            </button>

                        </div>


                        <div className="modal-usuario-body">

                            <div className="usuario-form-group">

                                <label>Nombre</label>

                                <input
                                    type="text"
                                    placeholder="Nombre del usuario"
                                    value={nuevoUsuario.nombre}
                                    onChange={(e) =>
                                        setNuevoUsuario({
                                            ...nuevoUsuario,
                                            nombre: e.target.value
                                        })
                                    }
                                />

                            </div>


                          <div className="usuario-form-group">

    <label>Usuario</label>

    <input
        type="text"
        placeholder="Nombre de usuario"
        value={nuevoUsuario.usuario}
        onChange={(e) =>
            setNuevoUsuario({
                ...nuevoUsuario,
                usuario: e.target.value
            })
        }
    />

</div>


                            <div className="usuario-form-group">

                                <label>Rol</label>

                                <select
                                    value={nuevoUsuario.rol}
                                    onChange={(e) =>
                                        setNuevoUsuario({
                                            ...nuevoUsuario,
                                            rol: e.target.value
                                        })
                                    }
                                >
                                    <option value="ADMINISTRADOR">
                                        Administrador
                                    </option>

                                    <option value="FACTURACIÓN">
                                        Facturación
                                    </option>

                                    <option value="COMERCIAL">
                                        Comercial
                                    </option>

                                </select>

                            </div>


                            <div className="usuario-form-group">

                                <label>Contraseña</label>

                                <input
                                    type="password"
                                    placeholder="Ingresa una contraseña"
                                    value={nuevoUsuario.password}
                                    onChange={(e) =>
                                        setNuevoUsuario({
                                            ...nuevoUsuario,
                                            password: e.target.value
                                        })
                                    }
                                />

                            </div>


                            <div className="usuario-form-group">

                                <label>Estado</label>

                                <select
                                    value={nuevoUsuario.estado}
                                    onChange={(e) =>
                                        setNuevoUsuario({
                                            ...nuevoUsuario,
                                            estado: e.target.value
                                        })
                                    }
                                >
                                    <option value="Activo">
                                        Activo
                                    </option>

                                    <option value="Inactivo">
                                        Inactivo
                                    </option>

                                </select>

                            </div>

                        </div>


                        <div className="modal-usuario-footer">

                            <button
                                className="cancelar-usuario-btn"
                                onClick={() =>
                                    setModalUsuarioAbierto(false)
                                }
                            >
                                Cancelar
                            </button>


                           <button
    className="guardar-usuario-btn"
    onClick={guardarUsuario}
>
    Guardar usuario
</button>

                        </div>

                    </div>

                </div>

            )}

        </div>

    );

}

}
export default Configuracion;