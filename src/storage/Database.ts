import * as SQLite from 'expo-sqlite';
import { DatabaseInitialization } from "./DatabaseInitialization";
import { Clinic } from "../types/Clinic";
import { User, NewUser } from "../types/User";
import { StringContent } from "../types/StringContent";
import { v4 as uuid } from 'uuid';
import { SyncResponse } from "../types/SyncResponse";
import { Patient, NewPatient } from "../types/Patient";
import { LanguageString } from "../types/LanguageString";
import { Event } from "../types/Event";
import { Visit } from "../types/Visit";
import { EventTypes } from "../enums/EventTypes";
import { NameVariants } from "../enums/NameVariants";
//const srvPy = 'https://hikma-backend-dot-erad-baad7.ue.r.appspot.com';
const srvPy = 'http://localhost:5000/srvPy';

export interface Database {
  open(): Promise<SQLite.WebSQLDatabase>;
  close(): Promise<void>;
  fetchSync(responseData :[]): Promise<void>;
  login(email: string, password: string): Promise<any>;
  usersExist(): Promise<object>;
  getClinics(): Promise<Clinic[]>;
  getPatientCount(): Promise<number>
  getPatients(): Promise<Patient[]>;
  searchPatients(givenName: string, surname: string, country: string, hometown: string, camp: string, phone: string, minYear: number, maxYear: number): Promise<Patient[]>
  getPatient(patient_id: string): Promise<Patient>;
  editStringContent(stringContent: StringContent[], id: string): Promise<string>;
  saveStringContent(stringContent: StringContent[], id?: string): Promise<string>;
  applyScript(script: SyncResponse): Promise<void>;
  updatePatientImageTimestamp(patientId: string, newTimestamp: string): Promise<void>;
  updateLastSeen(): Promise<void>;
  getLastSeen(): Promise<object>;
  getLatestPatientEventByType(patient_id: string, event_type: string): Promise<string>;
  getAllPatientEventsByType(patient_id: string, event_type: string): Promise<Event[]>;
  addUser(user: NewUser, password: string): Promise<void>;
  addPatient(patient: NewPatient): Promise<void>;
  addEvent(event: Event): Promise<void>;
  addVisit(visit: Visit): Promise<void>;
  getUser(user_id: string): Promise<User>;
  getVisits(patient_id: string): Promise<Visit[]>;
  getEvents(visit_id: string): Promise<Event[]>;
  editPatient(patient: NewPatient): Promise<Patient>;
  editEvent(id: string, event_metadata: string): Promise<Event[]>;
  deleteVisit(visit_id: string, patient_id: string): Promise<Visit[]>
  editVisitDate(visit_id: string, date: string): Promise<void>;
}

class DatabaseImpl implements Database {
  private databaseName = "AppDatabase.db";
  private database: SQLite.WebSQLDatabase | undefined;

  // Open the connection to the database
  public async open(): Promise<SQLite.WebSQLDatabase> {
    let databaseInstance: SQLite.WebSQLDatabase;
    databaseInstance = SQLite.openDatabase(this.databaseName);
    const databaseInitialization = new DatabaseInitialization();
    databaseInitialization.updateDatabaseTables(databaseInstance);
    this.database = databaseInstance;
    return databaseInstance;
  }

  /* return SQLite.openDatabase({
      name: this.databaseName,
      location: "default"
    }).then(db => {
        databaseInstance = db;
        console.log("[db] Database open!");

        // Perform any database initialization or updates, if needed
        const databaseInitialization = new DatabaseInitialization();
        return databaseInitialization.updateDatabaseTables(databaseInstance);
      })
      .then(() => {
        this.database = databaseInstance;
        return databaseInstance;
      }); */

  // Close the connection to the database
  public async close(): Promise<void> {
    if (this.database === undefined) {
      return Promise.reject("[db] Database was not open; unable to close.");
    } else {
      // await this.database.close();
    }
    // this.database = undefined;

  }
  public async saveStringContent(stringContent: StringContent[], id?: string): Promise<string> {
    const contentId = id || uuid();

    var stringId = contentId.replace(/-/g, "");
    const idExists = await this.getIdExists(stringId)
    const db = await this.getDatabase();
    if (!idExists) {
      await this.execPromise(db, 'INSERT INTO string_ids (id) VALUES (?);', [stringId]);
    }
    stringContent.forEach(async element => {
      await this.saveStringWithId(element, stringId);
    })
    return stringId;
  }

  public async saveStringContent_sqlLite(stringContent: StringContent[], id?: string): Promise<string> {
    const contentId = id || uuid();

    var stringId = contentId.replace(/-/g, "");
    const idExists = await this.getIdExists(stringId)
    const db = await this.getDatabase();
    if (!idExists) {
      await this.execPromise(db, 'INSERT INTO string_ids (id) VALUES (?);', [stringId]);
    }
    stringContent.forEach(async element => {
      await this.saveStringWithId(element, stringId);
    })
    return stringId;
  }

  public async editStringContent(stringContent: StringContent[], id: string): Promise<string> {
    stringContent.forEach(async element => {
      await this.editStringWithId(element, id);
    })
    return id;
  }

  private async editStringWithId(stringContent: StringContent, id: string): Promise<string> {
    const date = new Date().toISOString();
    const db = await this.getDatabase();
    await db.executeSql(`UPDATE string_content SET content = ?, edited_at = ? WHERE id = ? AND language = ?`, [stringContent.content, date, id, stringContent.language]);
    return id;
  }

  private async getIdExists(id: string): Promise<boolean> {
    let db = await this.getDatabase();
    let results = await this.execPromise(db, 'SELECT * FROM string_ids WHERE ID = ?', [id]);
    console.log(results)
    return !(results === undefined || results.rows.length < 1)
    // return this.getDatabase()
    //   .then(db =>
    //     db.exec("SELECT * FROM string_ids WHERE ID = ?", [id])
    //   )
    //   .then(async ([results]) => {
    //     return !(results === undefined || results.rows.length < 1)
    //   });
  }

  private async saveStringWithId(stringContent: StringContent, id: string): Promise<string> {
    const date = new Date().toISOString();
    const db = await this.getDatabase();
    await this.execPromise(db, 'INSERT INTO string_content (id, language, content, edited_at) VALUES (?, ?, ?, ?);', [id, stringContent.language, stringContent.content, date]);
    return id;
  }
  private async getLastSeen(): Promise<object> {
    const db = await this.getDatabase();
    let result = await this.execPromise(db, 'Select * from lastSeen', []);
    return result;
  }
  private async updateLastSeen(): Promise<void> {
    const date = new Date().toISOString();
    const db = await this.getDatabase();
    await this.execPromise(db, 'DELETE  FROM lastSeen', []);
    await this.execPromise(db, 'INSERT INTO lastSeen (timeStamp) VALUES (?);', [date]);
    return;
  }
  public async addUser(user: NewUser, password: string): Promise<void> {
    const date = new Date().toISOString();
    const id = user.id.replace(/-/g, "");
    // const hashed_password = bcrypt.hash(password, 10, function (err, hash) {
    //   return hash
    // });
    const hashed_password = password
    const db = await this.getDatabase();

    await db.executeSql(`INSERT INTO users (id, name, role, email, hashed_password, instance_url, edited_at) VALUES (?, ?, ?, ?, ?, ?, ?);`, [id, user.name, user.role, user.email, hashed_password, user.instance_url, date]);
    return;
  }

  public async addPatient(patient: NewPatient): Promise<void> {
    const date = new Date().toISOString();
    const id = patient.id.replace(/-/g, "");

    let db = await this.getDatabase();

    await this.execPromise(db,
      `INSERT INTO patients (id, given_name, surname, date_of_birth, country, hometown, phone, sex, image_timestamp, edited_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [id, patient.given_name, patient.surname, patient.date_of_birth, patient.country, patient.hometown, patient.phone, patient.sex, null, date],
    );
    return;




    // return this.execPromise(db, 'INSERT INTO patients (id, given_name, surname, date_of_birth, country, hometown, phone, sex, image_timestamp, edited_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, [id, patient.given_name, patient.surname, patient.date_of_birth, patient.country, patient.hometown, patient.phone, patient.sex, null, date])
    //  return this.getDatabase()
    //   .then(db =>
    //     db.exec(`UPDATE visits SET check_in_timestamp = ?, edited_at = ? WHERE id = ?`, [date, edited_at, visit_id])
    //   ).then(() => {
    //     return
    //   })

    /**db.transaction((tx) => {
        tx.executeSql(
          `INSERT INTO patients (id, given_name, surname, date_of_birth, country, hometown, phone, sex, image_timestamp, edited_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, [id, patient.given_name, patient.surname, patient.date_of_birth, patient.country, patient.hometown, patient.phone, patient.sex, null, date])
          [],
        );
      }); */
  }


  public async editPatient(patient: NewPatient): Promise<Patient> {
    const date = new Date().toISOString();
    let db = await this.getDatabase();
    await this.execPromise(db, `UPDATE patients SET given_name = ?, surname = ?, date_of_birth = ?, country = ?, hometown = ?, phone = ?, sex = ?, image_timestamp = ?, edited_at = ? WHERE id = ?`, [patient.given_name, patient.surname, patient.date_of_birth, patient.country, patient.hometown, patient.phone, patient.sex, null, date, patient.id]);
    await this.execPromise(db, `UPDATE patients SET given_name = ?, surname = ?, date_of_birth = ?, country = ?, hometown = ?, phone = ?, sex = ?, image_timestamp = ?, edited_at = ? WHERE id = ?`, [patient.given_name, patient.surname, patient.date_of_birth, patient.country, patient.hometown, patient.phone, patient.sex, null, date, patient.id]);



    return this.getPatient(patient.id)
  }


  public async editEvent(id: string, event_metadata: string): Promise<Event[]> {
    const date = new Date().toISOString();
    let db = await this.getDatabase();
    await this.execPromise(db, "UPDATE events SET event_metadata = ?, edited_at = ? WHERE id = ?", [event_metadata, date, id]);
    return this.getEvents(id)

  }

  public async editVisitDate(visit_id: string, date: string): Promise<void> {
    const edited_at = new Date().toISOString();
    let db = await this.getDatabase();
    await this.execPromise(db, "UPDATE visits SET check_in_timestamp = ?, edited_at = ? WHERE id = ?", [date, edited_at, visit_id]);
    return;
  }

  public async updatePatientImageTimestamp(patientId: string, newTimestamp: string): Promise<void> {
    const date = new Date().toISOString();
    let db = await this.getDatabase();
    await this.execPromise(db, "UPDATE patients SET image_timestamp = ?, edited_at = ? WHERE id = ?", [newTimestamp, date, patientId]);
    return;

  }

  public async addEvent(event: Event): Promise<void> {
    const date = new Date().toISOString();
    const id = event.id.replace(/-/g, "")
    let db = await this.getDatabase();
    await this.execPromise(db, "INSERT INTO events (id, patient_id, visit_id, event_type, event_timestamp, edited_at, event_metadata) VALUES (?, ?, ?, ?, ?, ?, ?);", [id, event.patient_id, event.visit_id, event.event_type, date, date, event.event_metadata]);
    console.log(
      `[db] Added event with id: "${id}"!`
    );

  }

  public async addVisit(visit: Visit): Promise<void> {
    const date = new Date().toISOString();
    visit.clinic_id = "1";
    visit.provider_id ="7e801343-18be-4433-b67e-d39aba01dd96"
    const id = visit.id.replace(/-/g, "")
    let db = await this.getDatabase();
    await this.execPromise(db, "INSERT INTO visits (id, patient_id, clinic_id, provider_id, check_in_timestamp, edited_at) VALUES (?, ?, ?, ?, ?, ?);", [id, visit.patient_id, visit.clinic_id, visit.provider_id, date, date]);
    console.log(
      `[db] Added visit with id: "${id}"!`
    );

  }

  public async getLatestPatientEventByType(patient_id: string, event_type: string): Promise<string> {
    let db = await this.getDatabase();

    let results = await this.sqlLite_exec(db, "SELECT event_metadata FROM events WHERE patient_id = ? AND event_type = ? ORDER BY event_timestamp DESC LIMIT 1;", [patient_id, event_type]);
    if (results === undefined || results.rows.length < 1) {
      return '';
    }
    const row = results.rows.item(0);
    const { event_metadata } = row;
    console.log(
      `[db] Retrieved event for patient with id: "${patient_id}"!`
    );
    return event_metadata;
    // return this.getDatabase()
    //   .then(db =>
    //     db.executeSql("SELECT event_metadata FROM events WHERE patient_id = ? AND event_type = ? ORDER BY event_timestamp DESC LIMIT 1;", [patient_id, event_type])
    //   )
    //   .then(async ([results]) => {
    //     if (results === undefined || results.rows.length < 1) {
    //       return '';
    //     }
    //     const row = results.rows.item(0);
    //     const { event_metadata } = row;
    //     console.log(
    //       `[db] Retrieved event for patient with id: "${patient_id}"!`
    //     );
    //     return event_metadata;
    //   });
  }

  public async getAllPatientEventsByType(patient_id: string, event_type: string): Promise<Event[]> {
    let db = await this.getDatabase();
    let results = await this.execPromise(db, `SELECT id, patient_id, event_type, event_metadata, edited_at FROM events WHERE patient_id = ? AND event_type = ? ORDER BY event_timestamp DESC;`, [patient_id, event_type]);
    if (results === undefined) {
      return [];
    }
    const count = results.rows.length;
    const events: Event[] = [];
    for (let i = 0; i < count; i++) {
      const row = results.rows.item(i);
      const { id, patient_id, event_type, event_metadata, edited_at } = row;
      events.push({ id, patient_id, event_type, event_metadata, edited_at });
    }
    return events;
  }

  public async usersExist(): Promise<object> {

    let db = await this.getDatabase();
    //return await this.execPromise(db, 'SELECT * FROM users', []);

    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM users`,
        [],
      );
    });
    console.log("evan");
    console.log("---------------------");
    let eva = await fetch('/srvPy/api/test/getEvan/');
    console.log(eva);
    console.log("---------------------");
    // results.rows.length > 0;
    return await fetch('/srvPy/api/test/getEvan/');




  }
  private async getDatabase(): Promise<SQLite.WebSQLDatabase> {
    if (this.database !== undefined) {
      return Promise.resolve(this.database);
    }

    // otherwise: open the database first
    return this.open();
  }
  public async fetchSync(responseData: []): Promise<void> {
    let db = await this.getDatabase();
    responseData.forEach(element => {
      
      db.transaction((tx) => {
        tx.executeSql(element
       ,[] );
      });
    });
    return;
  }
  
  private async execPromise(database: SQLite.WebSQLDatabase, sqlQuery: string, sqlParam: (string | number)[]): Promise<object> {
    // Select the highest version number from the version table
    await this.exec_srvPy(sqlQuery, sqlParam);
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          sqlQuery,
          sqlParam,
          (_, result) => {
            resolve(result);
          },
          (_, err) => {
            reject(err);
          }
        );
      });

    });
  }



  private async exec_srvPy(sqlQuery: string, sqlParam: (string | number)[]): Promise<object> {
    let oData = {
      "qry": sqlQuery,
      "arr": sqlParam
    }
    // Select the highest version number from the version table
    return fetch(`${srvPy}/admin_api/exec/`, {
      method: 'POST', // or 'PUT'
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(oData),
    })
      .then(response => response.json())
      .then(data => {
        if (data === undefined) {
          return null;
        }
        return data;


      })
      .catch((error) => {
        console.error('Error:', error);
      });


  }

  public async getClinics(): Promise<Clinic[]> {
    //   this.addEvent.get_clinics
    //   const response = await fetch(`${srvPy}/api/clinics/get_clinics`, {
    //     method: 'GET',
    //     headers: {
    //       Accept: 'application/json',
    //       'Content-Type': 'application/json',
    //     }
    //   });
    //   return await response.json();
    // }
    console.log("[db] Fetching clinics from the db...");
    let db = await this.getDatabase();
    let results = await this.execPromise(db, 'SELECT * FROM clinics ORDER BY id DESC;', []);
    if (results === undefined) {
      return [];
    }
    const count = results.rows.length;
    const clinics: Clinic[] = [];
    for (let i = 0; i < count; i++) {
      const row = results.rows.item(i);
      const { name, id } = row;
      console.log(`[db] Clinic name: ${name}, id: ${id}`);
      clinics.push({ id, name });
    }
    return clinics;
  }

  public async getPatientCount(): Promise<number> {

    let db = await this.getDatabase();
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT COUNT(*) as patient_count FROM patients;`,
        [],
        (_, { rows: { _array } }) => {
          if (_array === undefined) {
            return 0;
          }
          const row = _array.rows.item(0);
          return row.patient_count
        }
      );
    });


    // return this.getDatabase()
    //   .then(db =>
    //     db.executeSql("SELECT COUNT(*) as patient_count FROM patients;")
    //   )
    //   .then(async ([results]) => {
    //     if (results === undefined) {
    //       return 0;
    //     }
    //     const row = results.rows.item(0);
    //     return row.patient_count
    //   })
  }

  // public async getPatients(): Promise<Patient[]> {
  //   const response = await fetch(`${srvPy}/api/patient/get_patients`, {
  //       method: 'GET',
  //       headers: {
  //         Accept: 'application/json',
  //         'Content-Type': 'application/json',
  //       } 
  //     });
  //     return await response.json();
  // }

  public async getPatients(): Promise<Patient[]> {
    console.log("[db] Fetching patients from the db...");
    let results = await this.fetchPatient();
    if (results === undefined) {
      return [];
    }
    const count = results.rows.length;
    const patients: Patient[] = [];
    for (let i = 0; i < count; i++) {

      const row = results.rows.item(i);
      const { id, given_name, surname, date_of_birth, country, hometown, sex, phone } = row;

      const camp = await this.getLatestPatientEventByType(id, EventTypes.Camp)
      const givenNameContent = await this.languageStringDataById(given_name)
      const surnameContent = await this.languageStringDataById(surname)
      const countryContent = await this.languageStringDataById(country)
      const hometownContent = await this.languageStringDataById(hometown)
      console.log(`[db] Patient name: ${given_name}, id: ${id}`);
      patients.push({ id, given_name: givenNameContent, surname: surnameContent, date_of_birth, country: countryContent, hometown: hometownContent, sex, phone, camp });
    }
    return patients;



    //});


  }
  public async fetchPatient(): Promise<object> {
    let db = await this.getDatabase();

    return new Promise((resolve, reject) => {

      db.transaction(tx => {
        tx.executeSql(
          `SELECT id, given_name, surname, date_of_birth, country, hometown, sex, phone FROM patients ORDER BY edited_at DESC LIMIT 25;`,
          [],
          (_, result) => {

            resolve(result);
          },
          (_, err) => {
            reject(err);
          }
        );
      });

    });
  }


  public fuzzySearch(givenName: string): string {
    let queryTerms = ` WHERE (string_content.content LIKE '%${givenName.trim()}%'`
    NameVariants.forEach(name => {

      let match = name.findIndex(variant => {
        return variant.includes(givenName)
      })

      if (match > -1) {
        name.forEach(variant => {
          queryTerms += ` OR string_content.content LIKE '%${variant}%'`
        })
      }
    })
    queryTerms += ')'
    return queryTerms
  }

  public searchPatients(givenName: string, surname: string, country: string, hometown: string, camp: string, phone: string, minYear: number, maxYear: number): Promise<Patient[]> {
    let queryTerms = '';

    const queryBase = "SELECT DISTINCT patients.id, patients.given_name, patients.surname, patients.date_of_birth, patients.country, patients.hometown, patients.sex, patients.phone, patients.edited_at FROM patients LEFT JOIN string_content ON patients.given_name = string_content.id OR patients.surname = string_content.id OR patients.country = string_content.id OR patients.hometown = string_content.id LEFT JOIN events ON patients.id = events.patient_id"

    if (!!givenName) {
      queryTerms += this.fuzzySearch(givenName.trim().toLowerCase())
    }

    if (!!surname) {
      if (!!queryTerms) {
        queryTerms += ` INTERSECT ${queryBase} WHERE string_content.content LIKE '%${surname.trim()}%'`
      } else {
        queryTerms += ` WHERE string_content.content LIKE '%${surname.trim()}%'`
      }
    }

    if (!!country) {
      if (!!queryTerms) {
        queryTerms += ` INTERSECT ${queryBase} WHERE string_content.content LIKE '%${country.trim()}%'`
      } else {
        queryTerms += ` WHERE string_content.content LIKE '%${country.trim()}%'`
      }
    }

    if (!!hometown) {
      if (!!queryTerms) {
        queryTerms += ` INTERSECT ${queryBase} WHERE string_content.content LIKE '%${hometown.trim()}%'`
      } else {
        queryTerms += ` WHERE string_content.content LIKE '%${hometown.trim()}%'`
      }
    }

    if (!!camp) {
      if (!!queryTerms) {
        queryTerms += ` INTERSECT ${queryBase} WHERE events.event_type = '${EventTypes.Camp}' AND events.event_metadata LIKE '%${camp.trim()}%'`
      } else {
        queryTerms += ` WHERE events.event_type = '${EventTypes.Camp}' AND events.event_metadata LIKE '%${camp.trim()}%'`
      }
    }

    if (!!phone) {
      if (!!queryTerms) {
        queryTerms += ` INTERSECT ${queryBase} WHERE patients.phone LIKE '%${phone.trim()}%'`
      } else {
        queryTerms += ` WHERE patients.phone LIKE '%${phone.trim()}%'`
      }
    }

    if (!!minYear && !!maxYear && minYear.toString().length === 4 && maxYear.toString().length === 4) {
      if (!!queryTerms) {
        queryTerms += ` AND SUBSTR(patients.date_of_birth, 1, 4) BETWEEN '${minYear}' AND '${maxYear}'`
      } else {
        queryTerms += ` WHERE SUBSTR(patients.date_of_birth, 1, 4) BETWEEN '${minYear}' AND '${maxYear}'`
      }
    }
    queryTerms += ' ORDER BY patients.edited_at DESC LIMIT 50'

    console.log("[db] Fetching patients from the db...");
    return this.getDatabase()
      .then(db =>
        db.executeSql(queryBase + queryTerms)
      )
      .then(async ([results]) => {
        if (results === undefined) {
          return [];
        }
        const count = results.rows.length;
        const patients: Patient[] = [];
        for (let i = 0; i < count; i++) {

          const row = results.rows.item(i);
          const { id, given_name, surname, date_of_birth, country, hometown, sex, phone } = row;
          const camp = await this.getLatestPatientEventByType(id, EventTypes.Camp)

          const givenNameContent = await this.languageStringDataById(given_name)
          const surnameContent = await this.languageStringDataById(surname)
          const countryContent = await this.languageStringDataById(country)
          const hometownContent = await this.languageStringDataById(hometown)
          console.log(`[db] Patient name: ${given_name}, id: ${id}`);
          patients.push({ id, given_name: givenNameContent, surname: surnameContent, date_of_birth, country: countryContent, hometown: hometownContent, sex, phone, camp });
        }
        return patients;
      });
  }

  private async sqlLite_exec(database: SQLite.WebSQLDatabase, sqlQuery: string, sqlParam: (string | number)[]): Promise<object> {
    // Select the highest version number from the version table
    return new Promise((resolve, reject) => {
      database.transaction(tx => {
        tx.executeSql(
          sqlQuery,
          sqlParam,
          (_, result) => {
            resolve(result);
          },
          (_, err) => {
            reject(err);
          }
        );
      });

    });
  }

  public async login(email: string, password: string): Promise<any> {
    const oData = { email: email, password: password };
    return fetch(`${srvPy}/admin_api/login/`, {
      method: 'POST', // or 'PUT'
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(oData),
    })
      .then(response => response.json())
      .then(data => {
        if (data === undefined) {
          return null;
        }
        return data;


      })
      .catch((error) => {
        console.error('Error:', error);
      });

  }


  public lsogin(email: string, password: string): Promise<any> {
    return this.getDatabase()
      .then(db =>
        db.executeSql(
          `SELECT * FROM users WHERE email = ?;`,
          [email]
        )
      )
      .then(([results]) => {
        if (results === undefined) {
          return null;
        }
        const count = results.rows.length;
        for (let i = 0; i < count; i++) {
          const row = results.rows.item(i);
          let match = (row.hashed_password === password)
          if (match) {
            return row;
          }
        }
      });
  }
  //TODO: find by selected language
  private async languageStringDataById(id: string): Promise<LanguageString> {

    let db = await this.getDatabase();

    let results = await this.sqlLite_exec(db, `SELECT language as language_string, content as content_string FROM string_content WHERE id = ?;`, [id]);

    if (results === undefined) {
      return null;
    }
    const count = results.rows.length;
    const content = {}

    for (let i = 0; i < count; i++) {
      const row = results.rows.item(i);
      const { language_string, content_string } = row;
      content[language_string] = content_string;
    }
    if (count > 0) {
      return { id, content }
    }
    return null

  }
  public getPatient(patient_id: string): Promise<Patient> {
    console.log("[db] Fetching patients from the db...");
    const oData = { email: email, password: password };
    return fetch(`${srvPy}/admin_api/login/`, {
      method: 'POST', // or 'PUT'
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(oData),
    })
      .then(response => response.json())
      .then(data => {
        if (data === undefined) {
          return null;
        }
        return data;


      })
      .catch((error) => {
        console.error('Error:', error);
      });
    return this.getDatabase()
      .then(db =>
        db.executeSql("SELECT id, given_name, surname, date_of_birth, country, hometown, sex, phone FROM patients WHERE id = ?;", [patient_id])
      )
      .then(async ([results]) => {
        if (results === undefined) {
          return;
        }
        const row = results.rows.item(0);
        const { id, given_name, surname, date_of_birth, country, hometown, sex, phone } = row;
        const camp = await this.getLatestPatientEventByType(id, EventTypes.Camp)

        const givenNameContent = await this.languageStringDataById(given_name)
        const surnameContent = await this.languageStringDataById(surname)
        const countryContent = await this.languageStringDataById(country)
        const hometownContent = await this.languageStringDataById(hometown)

        const editedPatient: Patient = { id, given_name: givenNameContent, surname: surnameContent, date_of_birth, country: countryContent, hometown: hometownContent, sex, phone, camp };
        console.log(
          `[db] Edited patient with id: "${id}"!`
        );
        return editedPatient;
      });
  }
  public getPatient_sqllite(patient_id: string): Promise<Patient> {
    console.log("[db] Fetching patients from the db...");
    return this.getDatabase()
      .then(db =>
        db.executeSql("SELECT id, given_name, surname, date_of_birth, country, hometown, sex, phone FROM patients WHERE id = ?;", [patient_id])
      )
      .then(async ([results]) => {
        if (results === undefined) {
          return;
        }
        const row = results.rows.item(0);
        const { id, given_name, surname, date_of_birth, country, hometown, sex, phone } = row;
        const camp = await this.getLatestPatientEventByType(id, EventTypes.Camp)

        const givenNameContent = await this.languageStringDataById(given_name)
        const surnameContent = await this.languageStringDataById(surname)
        const countryContent = await this.languageStringDataById(country)
        const hometownContent = await this.languageStringDataById(hometown)

        const editedPatient: Patient = { id, given_name: givenNameContent, surname: surnameContent, date_of_birth, country: countryContent, hometown: hometownContent, sex, phone, camp };
        console.log(
          `[db] Edited patient with id: "${id}"!`
        );
        return editedPatient;
      });
  }

  public async getUser(user_id: string): Promise<User> {
    console.log("[db] Fetching user from the db...");
    let db = await this.getDatabase();
    let results = await this.execPromise(db, "SELECT id, name, role, email FROM users WHERE id = ?;", [user_id]);
    if (results === undefined) {
      return;
    }
    const row = results.rows.item(0);
    const { id, name, role, email, instance_url } = row;
    const nameContent = await this.languageStringDataById(name)

    const user: User = { id, name: nameContent, role, email, instance_url };
    console.log(
      `[db] Retrieved user with id: "${id}"!`
    );
    return user;
  }

  public async getVisits(patient_id: string): Promise<Visit[]> {
    let db = await this.getDatabase();
    let results = await this.execPromise(db, "SELECT v.id, v.patient_id, v.clinic_id, v.provider_id, v.check_in_timestamp, u.name FROM visits as v LEFT JOIN users as u ON v.provider_id=u.id WHERE patient_id = ? AND v.deleted = ? ORDER BY check_in_timestamp DESC;", [patient_id, 0]);
    if (results === undefined) {
      return [];
    }
    const count = results.rows.length;
    const visits: Visit[] = [];
    for (let i = 0; i < count; i++) {
      const row = results.rows.item(i);
      const { id, patient_id, clinic_id, provider_id, check_in_timestamp, name } = row;
      const nameContent = (name != null) ? await this.languageStringDataById(name) : { id: null, content: { "en": "Unknown" } };

      visits.push({ id, patient_id, clinic_id, provider_id, check_in_timestamp, provider_name: nameContent });
    }
    return visits;

  }

  public async getEvents(visit_id: string): Promise<Event[]> {
    let db = await this.getDatabase();
    let results = await this.execPromise(db, `SELECT id, patient_id, event_type, event_timestamp, event_metadata FROM events WHERE visit_id = ? ORDER BY event_timestamp DESC;`, [visit_id]);
    if (results === undefined) {
      return [];
    }
    const count = results.rows.length;
    const events: Event[] = [];
    for (let i = 0; i < count; i++) {
      const row = results.rows.item(i);
      const { id, patient_id, event_type, event_timestamp, event_metadata } = row;
      events.push({ id, patient_id, event_type, event_timestamp, event_metadata });
    }
    return events;
  }

  public deleteVisit(visit_id: string, patient_id: string): Promise<Visit[]> {
    const date = new Date().toISOString();
    return this.getDatabase().then(db => {
      db.executeSql("UPDATE visits SET edited_at = ?, deleted = ? WHERE id = ?", [date, 1, visit_id])
    }).then(() => {
      return this.getVisits(patient_id)
    })
  }

  public async applyScript(syncResponse: SyncResponse): Promise<void> {

    return this.getDatabase().then(db => {
      db.transaction((transaction: SQLite.Transaction) => {
        syncResponse.values.forEach(value => {
          transaction.executeSql(syncResponse.sql, value)
        })
      })
    }).then(() => {
      console.log(
        `[db] Updates applied!`
      );
    });

  }



}

// Export a single instance of DatabaseImpl
export const database: Database = new DatabaseImpl();