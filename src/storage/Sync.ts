import { Platform, Alert } from "react-native";
//import RNFetchBlob, { FetchBlobResponse } from "rn-fetch-blob";
//import { zip, unzip, unzipAssets, subscribe } from 'react-native-zip-archive'
//import RNFS from "react-native-fs";
import { DATABASE } from "./Constants";
import { database } from "./Database";
import { SyncResponse } from "../types/SyncResponse";
import { LocalizedStrings } from "../enums/LocalizedStrings";
import NetInfo from "@react-native-community/netinfo";
const WebSQLDump = require("../services/websqldump");

const fs = require("fs");

const srvPy = 'http://localhost:5000/srvPy';

// import { Asset } from './enhancedAsset';
import * as FileSystem from 'expo-file-system';
export class DatabaseSync {

  public async performSync(instanceUrl: string, email: string, password: string, language: string): Promise<any> {
    // const target = this.getCompressionTargetPath()
    // try{
    //   const target = Platform.OS === 'ios' ? this.getLocalDBFilePathIOS() : this.getLocalDBFilePathAndroid()

    // } catch(err){
    //   console.log(err)

    // }
    let db = await database.open();
    WebSQLDump.websqldump.export({
      database: db,
      dataonly: true,
      linebreaks: true,
      success: function (sql) {
        console.log(sql)
        // $.ajax({ type: 'POST', url: 'http://myserver.com/sync', data: { clientId: '4EAB0319', localdb: sql });
      }
    });
    console.log(db)
    // var r = new FileReader();
    // r.onload = function(){ alert(r.result); };
    // r.readAsBinaryString(db);

    //var data = new FormData();
    //  data.append('db',db);
    //data.append('user', 'hubot');
    // const formData = new FormData();
    // formData.append('file', "C://Users//BasselEl-Bizri//AppData//wtv.txt");
    fetch(`${srvPy}/api/sync`, {
      method: 'POST', // or 'PUT'
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(db)
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
    // this.compressDB(this.getCompressionSourcePath(), target)
    // fs.uploadAsync(`${srvPy}/api/sync`, "SQLite/", {

    //   headers: {
    //     // 'authorization': `Bearer ${requestTokenUser}`,
    //     Accept: 'application/json',
    //     'Content-Type': 'multipart/form-data',
    //   },

    //   httpMethod: "POST",
    //   fieldName: `file`,
    //   parameters: {
    //     name: "db",
    //     description: "AppDatabase.db",
    //     data: "localFilePath"
    //   }
    // }).then(res => {
    //   console.log(res)
    // }).catch(err => {
    //   console.log(err);
    // });

    let state = await NetInfo.fetch()
    // if (state.isConnected) {
    //   const response = await this.syncDB(instanceUrl, email, password, target, language)
    //   const responseData = JSON.parse(response.data);
    //   responseData.to_execute.forEach(async (element: SyncResponse) => {
    //     await database.applyScript(element)
    //   });
    //   return
    // } else {
    //   Alert.alert(
    //     LocalizedStrings[language].syncFailure,
    //     LocalizedStrings[language].syncFailureConnection,
    //     [
    //       {
    //         text: 'OK',
    //       }
    //     ]
    //   )
    // }
    // return
  }

  private compressDB(
    sourcePath: string,
    targetPath: string
  ): Promise<void> {
    return zip(sourcePath, targetPath)
      .then((compressedPath) => {
        console.log(`zip completed at ${compressedPath}`)
      })
      .catch((error) => {
        console.log(error)
      })

  }
  private async syncDB(instanceUrl: string,
    email: string,
    password: string,
    localFilePath: string,
    language: string) {
    // const ass = FileSystem;
    const db = await database.open();
    const internalDbName = "AppDatabase.db"; // Call whatever you want
    const sqlDir = FileSystem.documentDirectory + "SQLite/";
    //const sas = await FileSystem.getInfoAsync(internalDbName);
    // console.log(sas)
    // return await  FileSystem.uploadAsync(`${srvPy}/api/sync`, "SQLite/", {
    //     uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    //     headers: {
    //       // 'authorization': `Bearer ${requestTokenUser}`,
    //       Accept: 'application/json',
    //       'Content-Type': 'multipart/form-data',
    //     },
    //     sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
    //     httpMethod: "POST",
    //     fieldName: `file`,
    //     parameters: {
    //       name: "db",
    //       description: "AppDatabase.db",
    //       data: localFilePath
    //     }
    //   }).then(res => {
    //     console.log(res)
    //   }).catch(err => {
    //     console.log(err);
    //   });

  }
  private async sysncDB(
    instanceUrl: string,
    email: string,
    password: string,
    localFilePath: string,
    language: string
  ): Promise<FetchBlobResponse> {
    database.close();
    console.log(
      `Syncing DB!`
    );
    return RNFetchBlob
      .config({ timeout: 600000 })
      .fetch(
        "POST",
        `${instanceUrl}/api/sync`,
        {
          "Content-Type": "multipart/form-data",
        }, [
        {
          name: 'email', data: email
        },
        {
          name: 'password', data: password,
        },
        {
          name: 'db', filename: 'AppDatabase.db', data: RNFetchBlob.wrap(localFilePath)
        }
      ]

        // RNFetchBlob.wrap(localFilePath)
      ).then(fetchBlobResponse => {
        console.log("Sync response: ", fetchBlobResponse);
        if (
          fetchBlobResponse.data &&
          fetchBlobResponse.respInfo &&
          fetchBlobResponse.respInfo.status === 200
        ) {
          console.log("Sync SUCCESS!");
          Alert.alert(
            LocalizedStrings[language].syncSuccess,
            null,
            [
              {
                text: 'OK',
              }
            ],
          )
          return fetchBlobResponse;
          // return responseData;
        } else {
          Alert.alert(
            LocalizedStrings[language].syncFailure,
            LocalizedStrings[language].syncFailureSystem,
            [
              {
                text: 'OK',
              }
            ],
          )
        }
      });
  }

  private getDatabaseName(): string {
    return DATABASE.FILE_NAME;
  }

  private getTargetPathName(): string {
    return DATABASE.COMPRESSED_FILE_NAME;
  }

  private getLocalDBFilePathAndroid(): string {
    return (
      RNFS.DocumentDirectoryPath + "/../databases/" + this.getDatabaseName()
    );
  }

  private getLocalDBFilePathIOS(): string {
    return (
      RNFS.LibraryDirectoryPath + "/LocalDatabase/" + this.getDatabaseName()
    );
  }

  private getCompressionSourcePath(): string {
    return (
      RNFS.DocumentDirectoryPath + "/databases/"
    );
  }

  private getCompressionTargetPath(): string {
    return (
      RNFS.DocumentDirectoryPath + "/databases/" + this.getTargetPathName()
    );
  }
}
